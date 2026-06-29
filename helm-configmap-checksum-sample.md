# 通用 ConfigMap checksum 模板

是的，单独提取 `data` 是为了避免循环依赖：ConfigMap 名称依赖 checksum，而 checksum
如果再 include 包含该名称的完整 `systemid.javaoption`，就会递归调用自身。

checksum、名称和 ConfigMap 骨架只需要定义一次。每个具体 ConfigMap 只定义自己的
data，并保留一个兼容现有调用方式的入口。

## 公共模板：只写一次

```gotemplate
{{- define "systemid.configmap.checksum" -}}
{{- include (printf "systemid.%s.data" .name) .root | sha256sum | trunc 12 -}}
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

同一个参数同时生成 annotation 和 ConfigMap 名称：

```gotemplate
{{- $javaoption := dict "root" . "name" "javaoption" -}}

spec:
  template:
    metadata:
      annotations:
        checksum/javaoption: {{ include "systemid.configmap.checksum" $javaoption | quote }}
    spec:
      volumes:
        - name: javaoption
          configMap:
            name: {{ include "systemid.configmap.name" $javaoption }}
```

因此，每增加一个 ConfigMap，只增加它自己的 `systemid.<name>.data` 和一行通用 render
调用；checksum 与命名逻辑不再复制。
