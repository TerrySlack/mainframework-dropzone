/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from "@testing-library/react";
import { FileSelector } from "../../src/shared/components/FileSelector";

const defaultHandlers = {
  onChange: jest.fn(),
  onDragOver: jest.fn(),
  onDrop: jest.fn(),
  onDragEnter: jest.fn(),
  onDragLeave: jest.fn(),
};

describe("FileSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with default message", () => {
    render(<FileSelector {...defaultHandlers} />);
    expect(screen.getByText("Drag 'n' drop some files here, or click to select files")).toBeInTheDocument();
  });

  it("renders with custom message", () => {
    render(<FileSelector {...defaultHandlers} messageParagraph="Custom upload message" />);
    expect(screen.getByText("Custom upload message")).toBeInTheDocument();
  });

  it("has accessible roles and labels", () => {
    render(<FileSelector {...defaultHandlers} />);
    const group = screen.getByRole("group", { name: "File upload drop zone" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Drag 'n' drop|Choose files/ })).toBeInTheDocument();
  });

  it("calls onChange when file input changes", () => {
    render(<FileSelector {...defaultHandlers} />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();

    const file = new File(["content"], "test.png", { type: "image/png" });
    fireEvent.change(input!, { target: { files: [file] } });

    expect(defaultHandlers.onChange).toHaveBeenCalledTimes(1);
  });

  it("clicking the button triggers file input click", () => {
    render(<FileSelector {...defaultHandlers} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, "click");

    const button = screen.getByRole("button", { name: /Drag 'n' drop|Choose files/ });
    fireEvent.click(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("calls onDragOver when dragging over", () => {
    render(<FileSelector {...defaultHandlers} />);
    const button = screen.getByRole("button", { name: /Drag 'n' drop|Choose files/ });

    fireEvent.dragOver(button, {
      dataTransfer: { files: [] },
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    });

    expect(defaultHandlers.onDragOver).toHaveBeenCalled();
  });

  it("calls onDrop when dropping files", () => {
    render(<FileSelector {...defaultHandlers} />);
    const button = screen.getByRole("button", { name: /Drag 'n' drop|Choose files/ });
    const file = new File(["x"], "test.png", { type: "image/png" });

    fireEvent.drop(button, {
      dataTransfer: { files: [file] },
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    });

    expect(defaultHandlers.onDrop).toHaveBeenCalled();
  });

  it("calls onDragEnter when dragging enter", () => {
    render(<FileSelector {...defaultHandlers} />);
    const button = screen.getByRole("button", { name: /Drag 'n' drop|Choose files/ });

    fireEvent.dragEnter(button, {
      currentTarget: button,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    });

    expect(defaultHandlers.onDragEnter).toHaveBeenCalled();
  });

  it("calls onDragLeave when dragging leave", () => {
    render(<FileSelector {...defaultHandlers} />);
    const button = screen.getByRole("button", { name: /Drag 'n' drop|Choose files/ });

    fireEvent.dragLeave(button, {
      currentTarget: button,
      relatedTarget: null,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    });

    expect(defaultHandlers.onDragLeave).toHaveBeenCalled();
  });

  it("accepts custom class names", () => {
    render(
      <FileSelector
        {...defaultHandlers}
        dropZoneWrapperClassName="custom-wrapper"
        clickableAreaClassName="custom-clickable"
      />,
    );
    const group = screen.getByRole("group");
    expect(group).toHaveClass("custom-wrapper");
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-clickable");
  });

  it("uses custom aria labels when provided", () => {
    render(<FileSelector {...defaultHandlers} ariaLabel="Custom drop zone" ariaLabelButton="Custom choose files" />);
    expect(screen.getByRole("group", { name: "Custom drop zone" })).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
