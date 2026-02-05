"use client";
import { SyntheticEvent } from "react";

export const withDragDefaults = <E extends SyntheticEvent>(handler: (e: E) => void) => {
  return (e: E) => {
    e.preventDefault();
    e.stopPropagation();
    handler(e);
  };
};
