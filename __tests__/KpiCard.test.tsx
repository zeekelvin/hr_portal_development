import { render, screen } from "@testing-library/react";
import KpiCard from "@/components/KpiCard";
import "@testing-library/jest-dom";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Active Employees" value={5} />);
    expect(screen.getByText("Active Employees")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
