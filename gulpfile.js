const gulp = require('gulp');
const del = require('del');
// const babel = require('gulp-babel');
const strip = require('gulp-strip-comments');

gulp.task('build', ['clean'], () => {
  // Babel
  gulp.src('src/index.js')
      // .pipe(babel())
      .pipe(strip())
      .pipe(gulp.dest('dist'));
  // CSS
  gulp.src('public/**/*')
      .pipe(gulp.dest('dist/public'));
  // package.json
  gulp.src('package.json')
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
