# Helm ConfigMap checksum sample for GitOps upgrade

## 结论

`checksum/config` annotation 只能解决一件事：当 ConfigMap 渲染结果变化时，让
Deployment / StatefulSet 的 `spec.template` 变化，从而触发 Pod 滚动更新。

它不能严格保证新 Pod 启动时一定已经挂载到新 ConfigMap 内容。因为如果 ConfigMap
仍然使用固定名字、固定 key，GitOps/Helm apply 期间旧 ConfigMap 已存在，新 Pod
仍可能引用到旧内容，尤其是多 controller 并发、缓存传播、`subPath` 挂载等场景。

更稳的做法是：

1. ConfigMap 名字带 checksum，或者 ConfigMap 内的文件 key 带 checksum。
2. Pod template annotation 也带同一个 checksum，用来触发 rollout。
3. Deployment 引用 checksum 化后的名字或 key，让新 Pod 显式依赖新版本配置。
4. 旧 checksum 的 ConfigMap 由 Helm/GitOps 后续 prune 或保留策略清理。

下面 sample 假设你们有一个公共 tpl，被多个 chart 复用。

## values.yaml

```yaml
app:
  name: demo-api

config:
  mountPath: /app/config
  fileName: application.yaml
  data:
    application.yaml: |
      server:
        port: 8080
      feature:
        enabled: true
```

## templates/_helpers.tpl

```gotemplate
{{/*
Common app name.
*/}}
{{- define "common.name" -}}
{{- default .Chart.Name .Values.app.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Render the logical config content once.

Keep this tpl stable and reuse it everywhere:
- checksum calculation
- ConfigMap data
- Deployment volume/items reference
*/}}
{{- define "common.config.rendered" -}}
{{- range $fileName, $content := .Values.config.data }}
{{ $fileName }}: |
{{ tpl $content $ | indent 2 }}
{{- end }}
{{- end -}}

{{/*
Short checksum for names and file keys.
Use the rendered config, not raw values, so tpl substitutions are included.
*/}}
{{- define "common.config.checksum" -}}
{{- include "common.config.rendered" . | sha256sum | trunc 12 -}}
{{- end -}}

{{/*
Versioned ConfigMap name.
This is the strongest option because a Pod references an immutable name.
*/}}
{{- define "common.configMap.name" -}}
{{- printf "%s-config-%s" (include "common.name" .) (include "common.config.checksum" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Versioned file key.
Use this when you must keep ConfigMap name stable, but want projected file keys
to be versioned.
*/}}
{{- define "common.config.versionedFileName" -}}
{{- $file := default "application.yaml" .Values.config.fileName -}}
{{- $sum := include "common.config.checksum" . -}}
{{- $ext := ext $file -}}
{{- if $ext -}}
{{- printf "%s-%s%s" (trimSuffix $ext $file) $sum $ext -}}
{{- else -}}
{{- printf "%s-%s" $file $sum -}}
{{- end -}}
{{- end -}}
```

## templates/configmap.yaml

推荐：ConfigMap 名字带 checksum。这样新 Pod 引用的是新名字，不会误读旧对象。

```gotemplate
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "common.configMap.name" . }}
  labels:
    app.kubernetes.io/name: {{ include "common.name" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
data:
{{ include "common.config.rendered" . | indent 2 }}
```

## templates/deployment.yaml

```gotemplate
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "common.name" . }}
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ include "common.name" . }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ include "common.name" . }}
      annotations:
        checksum/config: {{ include "common.config.checksum" . | quote }}
    spec:
      containers:
        - name: app
          image: nginx:1.27
          volumeMounts:
            - name: app-config
              mountPath: {{ .Values.config.mountPath | default "/app/config" }}
              readOnly: true
      volumes:
        - name: app-config
          configMap:
            name: {{ include "common.configMap.name" . }}
```

## If ConfigMap name must stay stable

如果你们因为权限、外部引用或现有约定，暂时不能改 ConfigMap 名字，可以退一步：
ConfigMap 名字固定，但文件 key 带 checksum。Deployment 的 `items.key` 也引用同一个
versioned key。

注意：这个方案比“ConfigMap 名字带 checksum”弱，因为对象本身仍是同名更新，但它能
避免应用读取固定文件名时碰到旧 key。为了保持容器内文件名稳定，可以用 `path` 映射回
原始文件名。

### Stable name ConfigMap

```gotemplate
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "common.name" . }}-config
data:
  {{ include "common.config.versionedFileName" . }}: |
{{- $file := default "application.yaml" .Values.config.fileName -}}
{{- tpl (index .Values.config.data $file) . | nindent 4 }}
```

### Stable path in container

```gotemplate
volumes:
  - name: app-config
    configMap:
      name: {{ include "common.name" . }}-config
      items:
        - key: {{ include "common.config.versionedFileName" . }}
          path: {{ .Values.config.fileName | default "application.yaml" }}
```

## Common tpl usage from app charts

如果每个业务 chart 通过公共 tpl 引用，可以把上面的 helper 放在 library chart 里：

```yaml
# Chart.yaml
dependencies:
  - name: platform-common
    version: 1.x.x
    repository: file://../platform-common
```

业务 chart 只保留 values：

```yaml
config:
  fileName: application.yaml
  data:
    application.yaml: |
      spring:
        profiles:
          active: {{ .Values.env }}
      redis:
        host: {{ .Values.redis.host }}

env: prod
redis:
  host: redis-master.default.svc.cluster.local
```

然后在公共模板里统一 `tpl $content $`，业务 chart 不需要自己重复 checksum 逻辑。

## Recommended default

优先用这个组合：

```text
checksum annotation + checksum ConfigMap name
```

只有必须保持 ConfigMap 名字不变时，再用：

```text
checksum annotation + checksum file key + stable mounted path
```

不要只依赖：

```text
checksum annotation + stable ConfigMap name + stable file key
```

这个组合只保证 Pod 会重启，不保证新 Pod 读取的配置版本是你期望的新版本。
