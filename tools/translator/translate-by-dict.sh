#!/usr/bin/env sh

# markdown 文档
nt translate packages/angular/cli/src/commands/**/*.md --engine=dict --dict ../angular/aio/tools/translator/dict/angular
