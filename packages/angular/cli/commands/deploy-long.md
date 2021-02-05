The command takes an optional project name, as specified in the `projects` section of the `angular.json` workspace configuration file.
When a project name is not supplied, executes the `deploy` builder for the default project.

该命令采用可选的项目名称，和 `angular.json` 工作区配置文件 `projects` 部分中所指定的一样。如果未提供项目名称，则为默认项目执行 `deploy` 构建器。

To use the `ng deploy` command, use `ng add` to add a package that implements deployment capabilities to your favorite platform.
Adding the package automatically updates your workspace configuration, adding a deployment
[CLI builder](guide/cli-builder).
For example:

要使用 `ng deploy` 命令，请使用 `ng add` 来添加一个实现部署目标平台的功能的包。添加软件包会自动更新你的工作区配置，并添加一个部署用的 [CLI 构建器](guide/cli-builder)。例如：

```json
"projects": {
  "my-project": {
    ...
    "architect": {
      ...
      "deploy": {
        "builder": "@angular/fire:deploy",
        "options": {}
      }
    }
  }
}
 ```