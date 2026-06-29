# 基于 `systemid.javaoption` 的 ConfigMap checksum

现有入口 `systemid.javaoption` 保持不变。由于它不能在自身内部 include 自身来计算
checksum，需要把原来 `data:` 下的内容抽到 `systemid.javaoption.data`；checksum、
ConfigMap 名称、Deployment annotation 和 volume 引用都复用同一组 helper。

## configmap.tpl

```gotemplate
{{/* 把现有 data: 下的内容原样移到这里。 */}}
{{- define "systemid.javaoption.data" -}}
# 这里保留你现有的 ConfigMap data 内容
{{- end -}}

{{- define "systemid.javaoption.checksum" -}}
{{- include "systemid.javaoption.data" . | sha256sum | trunc 12 -}}
{{- end -}}

{{- define "systemid.javaoption.name" -}}
{{- printf "javaoption-%s-%s"
      (.Values.deploymentName | trunc 39 | trimSuffix "-")
      (include "systemid.javaoption.checksum" .) -}}
{{- end -}}

{{- define "systemid.javaoption" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "systemid.javaoption.name" . }}
data:
{{- include "systemid.javaoption.data" . | nindent 2 }}
{{- end -}}
```

名称格式为：

```text
javaoption-<deploymentName>-<12位checksum>
```

`deploymentName` 最多保留 39 个字符，确保完整名称不超过 Kubernetes 的 63 字符
限制，并且不会把末尾 checksum 截断。

## Deployment Pod template

```gotemplate
spec:
  template:
    metadata:
      annotations:
        checksum/javaoption: {{ include "systemid.javaoption.checksum" . | quote }}
    spec:
      volumes:
        - name: javaoption
          configMap:
            name: {{ include "systemid.javaoption.name" . }}
```

调用 ConfigMap 的地方仍然保持：

```gotemplate
{{ include "systemid.javaoption" . }}
```

这样只需要移动原有 `data:` 内容，不需要新增 `values.config.data`，也不改变
`systemid.javaoption` 的调用方式。
