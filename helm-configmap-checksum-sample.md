# 通用 ConfigMap checksum 模板

是的，单独提取 `data` 是为了避免循环依赖：ConfigMap 名称依赖 checksum，而 checksum
如果再 include 包含该名称的完整 `systemid.javaoption`，就会递归调用自身。

checksum、名称和 ConfigMap 骨架只需要定义一次。每个具体 ConfigMap 只定义自己的
data，并保留一个兼容现有调用方式的入口。

## `root` 是什么

`root` 不是 Helm folder 名称，也不是 Helm 内置变量。它只是传入 `dict` 的自定义键：

```gotemplate
{{- $javaoption := dict "root" . "name" "javaoption" -}}
```

这里的 `root` 保存当前 Helm 上下文 `.`，所以公共 helper 可以通过
`.root.Values`、`.root.Release`、`.root.Chart` 和 `.root.Files` 访问原有对象。
如果调用位置位于 `range` 或 `with` 内，应传 `$`，避免 `.` 已经变成局部上下文：

```gotemplate
{{- $javaoption := dict "root" $ "name" "javaoption" -}}
```

## 实际 Folder structure

```text
helm/
├── shared-templates/
│   └── configmap.tpl        # 公共 helper，以及 systemid.<name>.data/入口定义
├── app1/
│   ├── Chart.yaml
│   ├── charts/
│   ├── values/
│   └── templates/
│       ├── configmap.yaml   # include 具体 ConfigMap
│       └── deployment.yaml  # annotation 和 ConfigMap 名称引用
├── app2/
│   ├── Chart.yaml
│   ├── charts/
│   ├── values/
│   └── templates/
│       ├── configmap.yaml
│       └── deployment.yaml
└── ...
```

当 `app1` 调用下面代码时，传入的 `root` 是 `app1` 的 Helm 上下文；当 `app2` 调用时，
它就是 `app2` 的上下文。因此 `.root.Values.deploymentName` 会读取当前 app 的 values，
而不是读取名为 `root` 的目录。

`shared-templates/configmap.tpl` 只定义 named templates，本身不产生资源：

```gotemplate
{{- define "systemid.javaoption.data" -}}
# javaoption data
{{- end -}}

{{- define "systemid.javaoption" -}}
{{- include "systemid.configmap.render" (dict "root" . "name" "javaoption") -}}
{{- end -}}
```

每个 app 自己的 `templates/configmap.yaml` 负责实际渲染：

```gotemplate
{{ include "systemid.javaoption" . }}
---
{{ include "systemid.logging" . }}
```

注意：原生 Helm 不会自动读取 chart 目录外的同级 `shared-templates`。上述方案成立的
前提是你们现有的构建流程会把该目录加载或复制到每个 app chart 中。如果没有这层
处理，`shared-templates` 应改成 Helm library chart，并由 `app1`、`app2` 声明为
dependency；checksum helper 本身不需要改变。

## 公共模板：只写一次

```gotemplate
{{- define "systemid.configmap.checksum" -}}
{{- include (printf "systemid.%s.data" .name) .root | sha256sum | trunc 12 -}}
{{- end -}}

{{- define "systemid.configmaps.checksum" -}}
{{- $checksums := list -}}
{{- range .names -}}
{{- $checksums = append $checksums
      (include "systemid.configmap.checksum" (dict "root" $.root "name" .)) -}}
{{- end -}}
{{- join ":" $checksums | sha256sum -}}
{{- end -}}

{{- define "systemid.configmap.name" -}}
{{- $base := printf "%s-%s" .name .root.Values.deploymentName -}}
{{- printf "%s-%s"
      ($base | trunc 50 | trimSuffix "-")
      (include "systemid.configmap.checksum" .) -}}
{{- end -}}

{{- define "systemid.configmap.render" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "systemid.configmap.name" . }}
data:
{{- include (printf "systemid.%s.data" .name) .root | nindent 2 }}
{{- end -}}
```

公共模板根据约定自动寻找 `systemid.<name>.data`。名称主体最多保留 50 个字符，
再追加 `-` 和 12 位 checksum，完整名称不会超过 63 个字符。

## javaoption：保留现有入口

```gotemplate
{{/* 把原来 data: 下的内容原样移到这里，不包含 data: 这一行。 */}}
{{- define "systemid.javaoption.data" -}}
# 你现有的 javaoption data 内容
{{- end -}}

{{- define "systemid.javaoption" -}}
{{- include "systemid.configmap.render" (dict "root" . "name" "javaoption") -}}
{{- end -}}
```

原来的调用方式不变：

```gotemplate
{{ include "systemid.javaoption" . }}
```

## 其他 ConfigMap

例如新增 `logging`，不需要再写 checksum、名称和 ConfigMap 头部：

```gotemplate
{{- define "systemid.logging.data" -}}
# logging 的 data 内容
{{- end -}}

{{- define "systemid.logging" -}}
{{- include "systemid.configmap.render" (dict "root" . "name" "logging") -}}
{{- end -}}
```

## Deployment

不需要为每个 ConfigMap 写一个 annotation。把当前 app 依赖的 ConfigMap 名称列出来，
生成一个聚合 checksum：

```gotemplate
{{- $configmaps := list "javaoption" "logging" -}}

spec:
  template:
    metadata:
      annotations:
        checksum/configmaps: {{ include "systemid.configmaps.checksum" (dict "root" $ "names" $configmaps) | quote }}
    spec:
      volumes:
        - name: javaoption
          configMap:
            name: {{ include "systemid.configmap.name" (dict "root" $ "name" "javaoption") }}
        - name: logging
          configMap:
            name: {{ include "systemid.configmap.name" (dict "root" $ "name" "logging") }}
```

任意一个 ConfigMap 的 data 变化，聚合 annotation 都会变化。实际上，带 checksum 的
ConfigMap 名称已经会改变 `spec.template.spec.volumes` 并触发 rollout；这个聚合
annotation 是额外的显式保障。如果需要从 annotation 直接看出具体哪个配置变化，才
改用 `checksum/javaoption`、`checksum/logging` 这种逐项 annotation。

因此，每增加一个 ConfigMap，只增加它自己的 `systemid.<name>.data`、一行通用 render
调用，并把 name 加进当前 app 的 `$configmaps` 列表；checksum 与命名逻辑不再复制。
