const babel = require("gulp-babel");
const del = require("del");
const gulp = require("gulp");
const runSequence = require("run-sequence");
const watch = require("gulp-watch");

const SRC_ROOT = "./src";
const LIB_ROOT = "./lib";

gulp.task("default", [ "build" ]);
gulp.task("dev", [ "build:watch" ]);

gulp.task("clean", cb => {
    del(`${LIB_ROOT}`).then(() => {
        cb()
    }, reason => {
        cb(reason);
    });
});

gulp.task("build", [ "clean" ], cb => {
    return gulp.src(`${SRC_ROOT}/**/*.js`)
        .pipe(babel())
        .pipe(gulp.dest(`${LIB_ROOT}`));
});

gulp.task("build:watch", [ "build" ], cb => {
    const jsPath = `${SRC_ROOT}/**/*.js`;
    return gulp.src(jsPath)
        .pipe(watch(jsPath))
        .pipe(babel())
        .pipe(gulp.dest(`${LIB_ROOT}`));
});
