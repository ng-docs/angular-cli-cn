The value of *settingOrProject* is one of the following.

*settingOrProject* 取以下值之一。

* "on" : Enables analytics gathering and reporting for the user.

  "on"：启用此用户的分析收集和上报功能。

* "off" : Disables analytics gathering and reporting for the user.

  "off"：禁用此用户的分析收集和上报功能。

* "ci" : Enables analytics and configures reporting for use with Continuous Integration,
which uses a common CI user.

  "ci"：启用分析并为持续集成环境配置上报功能，这通常会使用一个普通 CI 用户。

* "prompt" : Prompts the user to set the status interactively.

  "prompt"：提示用户交互式的设置此状态。

* "project" : Sets the default status for the project to the *projectSetting* value, which can be any of the other values. The *projectSetting* argument is ignored for all other values of *settingOrProject*.

  "project"：将项目的默认状态设置为 *projectSetting* 的值，该值可以是任何其他值。对于 *settingOrProject* 的所有其他值，该 *projectSetting* 参数会被忽略。

