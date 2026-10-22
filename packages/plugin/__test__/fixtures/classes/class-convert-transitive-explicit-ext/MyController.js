// Uses an explicit file extension in the import path ("./BaseController.js").
// The disk-fallback resolver must handle this correctly and find the ancestor
// even when it hasn't been eagerly processed yet.
import BaseController from "./BaseController.js";

class MyController extends BaseController {}
