import React from "react";
import { render, screen } from "@testing-library/react";
import KpiCard from "@/components/KpiCard";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Active Employees" value={5} />);
    expect(screen.getByText("Active Employees")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });
});
