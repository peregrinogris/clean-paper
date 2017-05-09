const gulp = require('gulp');
const del = require('del');
const jeditor = require('gulp-json-editor');
const strip = require('gulp-strip-comments');

gulp.task('build', ['clean'], () => {
  // Main
  gulp.src('src/index.js')
      .pipe(strip())
      .pipe(gulp.dest('dist'));
  // Public
  gulp.src('public/**/*')
      .pipe(gulp.dest('dist/public'));
  // package.json
  gulp.src('package.json')
      .pipe(jeditor(json => ({
        name: json.name,
        version: json.version,
        description: json.description,
        author: json.author,
        license: json.license,
        dependencies: json.dependencies,
        scripts: {
          start: 'node index',
        },
      })))
      .pipe(gulp.dest('dist'));
  // template.tpl
  gulp.src('src/template.tpl')
      .pipe(gulp.dest('dist'));
});

// Delete the dist directory
gulp.task('clean', () => (del(['dist'])));

// Rerun the task when a file changes
gulp.task('watch', () => {
  gulp.watch([
    'src/**/*',
  ], ['build']);
});

gulp.task('default', ['watch', 'build']);
