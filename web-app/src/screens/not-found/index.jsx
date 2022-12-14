import React from "react";

import Header from "components/Header";

import "./styles.css";

const NotFound = () => (
  <div className="not-found-container">
    <Header selected="404" />
    <h1 className="not-found-title">OH NO! 404</h1>
  </div>
);

export default NotFound;
