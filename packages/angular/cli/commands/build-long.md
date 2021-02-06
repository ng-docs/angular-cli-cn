The command can be used to build a project of type "application" or "library".
When used to build a library, a different builder is invoked, and only the `ts-config`, `configuration`, and `watch` options are applied.
All other options apply only to building applications.

该命令可用于构建“应用程序”或“库”类型的项目。当用于构建库时，将调用其他构建器，并且仅应用 `ts-config`、`configuration` 和 `watch` 选项。所有其他选项仅适用于构建应用程序。

The application builder uses the [webpack](https://webpack.js.org/) build tool, with default configuration options specified in the workspace configuration file (`angular.json`) or with a named alternative configuration.
A "production" configuration is created by default when you use the CLI to create the project, and you can use that configuration by specifying the `--configuration="production"` or the `--prod` option.

应用程序构建器使用 [webpack](https://webpack.js.org/) 作为构建工具，并在工作区配置文件（`angular.json`）中指定默认配置选项，或者使用有名字的替代配置。使用 CLI 创建项目时，默认情况下会创建 "production" 配置，并且可以通过指定 `--configuration="production"` 或 `--prod` 选项来使用该配置。

The configuration options generally correspond to the command options.
You can override individual configuration defaults by specifying the corresponding options on the command line.
The command can accept option names given in either dash-case or camelCase.
Note that in the configuration file, you must specify names in camelCase.

配置选项通常与命令选项相对应。你可以通过在命令行上指定相应的选项来覆盖各个配置的默认值。该命令可以接受以中线形式（dash-case）或小驼峰形式（camelCase）给出的选项名称。请注意，在配置文件中，必须以小驼峰形式指定名称。

Some additional options can only be set through the configuration file,
either by direct editing or with the `ng config` command.
These include `assets`, `styles`, and `scripts` objects that provide runtime-global resources to include in the project.
Resources in CSS, such as images and fonts, are automatically written and fingerprinted at the root of the output folder.

某些其他选项只能通过配置文件设置，方法是直接编辑它或使用 `ng config` 命令。其中包括 `assets`、`styles` 和 `scripts` 对象，这些对象提供了一些要包括在项目中的运行时全局资源。 CSS 中的资源（例如图像和字体）会自动写入输出文件夹的根目录并添加文件指纹。

For further details, see [Workspace Configuration](guide/workspace-config).

欲知详情，请参见[工作区配置](guide/workspace-config)。

