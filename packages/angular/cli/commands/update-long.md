Perform a basic update to the current stable release of the core framework and CLI by running the following command.

通过运行以下命令，对核心框架和 CLI 的当前稳定版本执行基本更新。

```
ng update @angular/cli @angular/core
```

To update to the next beta or pre-release version, use the `--next` option.

要更新到下一个 Beta 或预发行版本，请使用 `--next` 选项。

To update from one major version to another, use the format

要从一个主要版本更新到另一个，请使用以下格式

```
ng update @angular/cli@^<major_version> @angular/core@^<major_version>
```

We recommend that you always update to the latest patch version, as it contains fixes we released since the initial major release.
For example, use the following command to take the latest 10.x.x version and use that to update.

我们建议你始终更新到最新的补丁版本，因为它包含我们自最初的主版本以来发布的修复程序。例如，使用以下命令获取最新的 10.xx 版本并使用该版本进行更新。

```
ng update @angular/cli@^10 @angular/core@^10
```

For detailed information and guidance on updating your application, see the interactive [Angular Update Guide](https://update.angular.io/).

有关更新应用程序的详细信息和指南，请参见交互式的 [Angular 升级指南](https://update.angular.io/) 。

