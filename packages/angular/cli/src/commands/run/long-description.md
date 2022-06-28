Architect is the tool that the CLI uses to perform complex tasks such as compilation, according to provided configurations.
The CLI commands run Architect targets such as `build`, `serve`, `test`, and `lint`.
Each named target has a default configuration, specified by an "options" object,
and an optional set of named alternate configurations in the "configurations" object.

建筑师（Architect）是 CLI 用来根据所提供的配置执行复杂任务（例如编译）的工具。CLI 命令会运行建筑师目标(target)，例如 `build`、`serve`、`test` 和 `lint` 。每个命名目标都有一个默认配置，由 "options" 对象指定，在 "configurations" 对象中有一组可选的命名备用配置。

For example, the "serve" target for a newly generated app has a predefined
alternate configuration named "production".

例如，新生成的应用程序的 "serve" 目标具有名为 "production" 的预定义备用配置。

You can define new targets and their configuration options in the "architect" section
of the `angular.json` file.
If you do so, you can run them from the command line using the `ng run` command.
Execute the command using the following format.

你可以在 `angular.json` 文件的 "architect" 部分定义新目标及其配置选项。这样，以后就可以使用 `ng run` 命令来从命令行运行它们。使用以下格式执行命令。

```
ng run project:target[:configuration]
```
