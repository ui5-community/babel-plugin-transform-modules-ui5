// This fixture tests auto-detection of .view.jsx files (JSX views).

import JSView from "sap/ui/core/mvc/JSView";
import Button from "sap/m/Button";

class MyView extends JSView {
  getControllerName() {
    return "fixtures.classes.MyView";
  }

  createContent(oController) {
    return (
      <Button text="Press me" press={oController.onPress} />
    );
  }
}
