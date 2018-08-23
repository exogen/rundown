#!/usr/bin/env node
const fs = require('fs');
const remark = require('remark');
const toString = require('mdast-util-to-string');
const execa = require('execa');

function rundown(options) {
  return function transformer(tree, file) {
    let currentTask = null;

    tree.children.forEach(node => {
      switch (node.type) {
        case 'heading': {
          // Any level 2 heading is assumed to be a task.
          if (node.depth === 2) {
            const name = toString(node);
            currentTask = {
              name,
              lang: null,
              script: null
            };
            options.tasks[name] = currentTask;
          } else {
            // Any other heading will unassign the current task, because we
            // don't want to associate any code blocks with a task if we're at
            // another heading level.
            currentTask = null;
          }
          break;
        }
        case 'code': {
          if (currentTask && !currentTask.script) {
            currentTask.lang = node.lang;
            currentTask.script = node.value;
          }
          break;
        }
      }
    });
  };
}

const doc = fs.readFileSync('./Tasks.md', 'utf8');
const tasks = {};

remark()
  .use(rundown, { tasks })
  .process(doc, (err, file) => {
    const name = process.argv[2];
    const options = {
      stdio: 'inherit'
    };
    if (name) {
      const task = tasks[name];
      if (task) {
        switch (task.lang) {
          case 'sh':
          case 'shell':
            execa.shellSync(task.script, options);
            break;
          case 'js':
          case 'javascript':
            execa.sync('node', ['--eval', task.script], options);
            break;
          default:
            console.error(`no executor for language: ${task.lang}`);
        }
      } else {
        console.error(`task not found: ${name}`);
      }
    } else {
      console.log(tasks);
    }
  });
