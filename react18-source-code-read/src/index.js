import * as React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import jsx from "./pages/ExamplePage";
import TransitionPage2 from "./pages/TransitionPage2";
// import ContextPage2 from "./pages/ContextPage2";
// import OptimizingPage from "./pages/OptimizingPage";
// import UseMemoPage from "./pages/UseMemoPage";
// import UseCallbackPage from "./pages/UseCallbackPage";
// import LifeCyclePage from "./pages/LifeCyclePage";
// import SuspensePage from "./pages/SuspensePage";
import UseDeferredValuePage from "./pages/UseDeferredValuePage";
// import FunctionComponent from "./pages/FunctionComponent";

// ReactDOM.render(jsx, document.getElementById("root"));

const root = createRoot(document.getElementById("root"), {
  // unstable_strictMode: true,
});

// root.render(<ClassFunctionComponent />);
// root.render(jsx);

// setTimeout(() => {
// root.render(jsx);
// }, 1000);

// root.render(<TransitionPage2 />);

root.render(<UseDeferredValuePage />);

console.log("React", React.version); //sy-log
