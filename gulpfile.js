const gulp = require('gulp'),
      merge = require('merge-stream'),
      rimraf = require('rimraf'),
      sourcemaps = require('gulp-sourcemaps'),
      ts = require('gulp-typescript');


const srcDir = './lib';
const outputDir = './dist';
const tsProject = ts.createProject('tsconfig.json');


gulp.task('clean', function (cb) {
  rimraf(outputDir, cb);
});


gulp.task('build', function () {
  let tsBuild = gulp.src(srcDir + '/**/*.ts')
    .pipe(sourcemaps.init())
    .pipe(tsProject(ts.reporter.fullReporter(true)));

  return merge(
    tsBuild.js
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(outputDir)),
    tsBuild.dts
      .pipe(gulp.dest(outputDir))
  );
});


gulp.task('watch', ['build'], function () {
  gulp.watch(srcDir + '/**/*.ts', ['build']);
});
