# Helm ConfigMap checksum

不需要在 `values.yaml` 里约定 `config.data`。直接对 Helm 渲染后的
`templates/configmap.yaml` 计算 checksum：

```gotemplate
# templates/deployment.yaml
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum | quote }}
```

只要 `configmap.yaml` 的渲染结果发生变化，Pod template annotation 就会变化，
Deployment 因而触发滚动更新。ConfigMap 的内容来自哪个 values 字段、是否使用
`tpl`，都不影响这种写法。

`/configmap.yaml` 必须与 `templates` 下的实际文件名一致。

## 关于 ConfigMap 名称带 checksum

上面的通用写法给 Pod annotation 加 checksum，并不修改 ConfigMap 的
`metadata.name`。这通常已经足够，也是最简单的方案。

如果必须生成类似 `demo-config-a1b2c3d4` 的不可变 ConfigMap 名称，就不能直接对
整个 `configmap.yaml` 求 hash，因为名称本身位于该模板中，会形成循环依赖。此时必须
单独提取并 hash ConfigMap 的实际数据源；数据源可能是 values、chart 内文件或一个
named template，因此不存在一个不关心数据来源的通用单行写法。
