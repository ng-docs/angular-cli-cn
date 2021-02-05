Adds the npm package for a published library to your workspace, and configures
the project in the current working directory (or the default project if you are
not in a project directory) to use that library, as specified by the library's schematic.
For example, adding `@angular/pwa` configures your project for PWA support:

把一个已发布库的 npm 包添加到你的工作空间中，并且在当前工作目录下按照该库的原理图对项目进行配置，以使用该库。（如果没有在项目目录下，则为默认项目）。
比如添加 `@angular/pwa` 会把你的项目配置为支持 PWA 的：

```bash
ng add @angular/pwa
```

The default project is the value of `defaultProject` in `angular.json`.

默认项目就是指 `angular.json` 中的 `defaultProject` 所指定的。
