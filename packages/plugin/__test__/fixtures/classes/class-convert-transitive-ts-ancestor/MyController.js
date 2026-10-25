// Descendant processed before the TypeScript ancestor. Without the PM2 fix,
// readAndRecordFile enables JSX for the .ts ancestor and fails to parse
// `<string>input`, silently discarding the ancestry — leaving this class unconverted.
import BaseController from "./BaseController";

class MyController extends BaseController {}
