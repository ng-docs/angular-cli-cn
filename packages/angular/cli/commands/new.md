Creates and initializes a new Angular application that is the default project for a new workspace.

创建并初始化一个新的 Angular 应用程序，该应用程序是新工作区的默认项目。

Provides interactive prompts for optional configuration, such as adding routing support.
All prompts can safely be allowed to default.

提供交互式提示以提供可选配置，例如添加路由支持。可以放心地为所有提示选择其默认值。

* The new workspace folder is given the specified project name, and contains configuration files at the top level.

  新的工作空间文件夹名称就是指定的项目名称，并且在顶层包含了配置文件。

* By default, the files for a new initial application (with the same name as the workspace) are placed in the `src/` subfolder. Corresponding end-to-end tests are placed in the `e2e/` subfolder.

  默认情况下，新的初始应用程序（与工作空间名称相同）的文件放置在 `src/` 子文件夹中。相应的端到端测试位于 `e2e/` 子文件夹中。

* The new application's configuration appears in the `projects` section of the `angular.json` workspace configuration file, under its project name.

  新应用程序的配置位于工作区配置文件 `angular.json` 中 `projects` 部分的项目名称下。

* Subsequent applications that you generate in the workspace reside in the `projects/` subfolder.

  你在工作空间中生成的后续应用程序位于 `projects/` 子文件夹中。

If you plan to have multiple applications in the workspace, you can create an empty workspace by setting the `--createApplication` option to false.
You can then use `ng generate application` to create an initial application.
This allows a workspace name different from the initial app name, and ensures that all applications reside in the `/projects` subfolder, matching the structure of the configuration file.

如果你计划在工作空间中放多个应用程序，则可以通过将 `--createApplication` 选项设置为 false 来创建一个空的工作空间。然后，你可以使用 `ng generate application` 创建一个初始应用程序。这能让工作空间的名称不同于初始应用程序的名称，并确保所有应用程序都位于 `/projects` 子文件夹中，并与配置文件的结构匹配。
