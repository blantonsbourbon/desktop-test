# Helm ConfigMap 双重 checksum

目标：

- ConfigMap 名称带 checksum，确保新 Pod 引用明确的配置版本。
- Pod template annotation 带相同 checksum，显式触发滚动更新。
- 不要求 `values.yaml` 存在 `config.data`。

## templates/_helpers.tpl

把现有 ConfigMap 的 `data:` 内容原样移到 `mychart.configmap.data`。内容仍然可以引用
任意 values；`mychart` 应替换为实际 chart 名称，避免 helper 重名。

```gotemplate
{{- define "mychart.configmap.data" -}}
application.yaml: |
  server:
    port: {{ .Values.server.port }}
{{- end -}}

{{- define "mychart.configmap.checksum" -}}
{{- include "mychart.configmap.data" . | sha256sum | trunc 12 -}}
{{- end -}}

{{- define "mychart.configmap.name" -}}
{{- printf "%s-config-%s"
      (.Release.Name | trunc 43 | trimSuffix "-")
      (include "mychart.configmap.checksum" .) -}}
{{- end -}}
```

这里将 release name 截断到 43 个字符，使 `-config-`、12 位 checksum 和名称主体的
总长度不超过 Kubernetes 的 63 字符限制，同时不会截掉 checksum。

## templates/configmap.yaml

```gotemplate
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "mychart.configmap.name" . }}
data:
{{ include "mychart.configmap.data" . | nindent 2 }}
```

## templates/deployment.yaml

```gotemplate
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include "mychart.configmap.checksum" . | quote }}
    spec:
      volumes:
        - name: app-config
          configMap:
            name: {{ include "mychart.configmap.name" . }}
```

checksum 只定义和计算一次。ConfigMap 名称、annotation 和 volume 引用始终使用同一
结果；无论配置来自哪些 values 字段，都不需要额外构造 `config.data`。
