import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TodoistSettings } from "../TodoistSettings";
import { api } from "~/trpc/react";

// Mock tRPC
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: vi.fn(),
    task: {
      getTodoistStatus: {
        useQuery: vi.fn(),
      },
      updateTodoistToken: {
        useMutation: vi.fn(),
      },
    },
  },
}));

// Mock window.alert and window.confirm
global.alert = vi.fn();
global.confirm = vi.fn();

describe("TodoistSettings", () => {
  const mockUtils = {
    task: {
      getTodoistStatus: {
        invalidate: vi.fn(),
      },
    },
  };

  const mockUpdateToken = {
    mutate: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.useUtils as any).mockReturnValue(mockUtils as any);
    vi.mocked(api.task.updateTodoistToken.useMutation).mockReturnValue(
      mockUpdateToken as any,
    );
  });

  describe("when not connected to Todoist", () => {
    beforeEach(() => {
      vi.mocked(api.task.getTodoistStatus.useQuery).mockReturnValue({
        data: { connected: false },
      } as any);
    });

    it("renders the settings panel with disconnected status", () => {
      render(<TodoistSettings />);

      expect(
        screen.getByText("Todoist Integration Settings"),
      ).toBeInTheDocument();
      expect(screen.getByText("⚠️ Not connected")).toBeInTheDocument();
      expect(screen.getByText("Connect Todoist")).toBeInTheDocument();
    });

    it("shows correct placeholder text when not connected", () => {
      render(<TodoistSettings />);

      const input = screen.getByPlaceholderText("Enter your Todoist API token");
      expect(input).toBeInTheDocument();
    });

    it("does not show disconnect button when not connected", () => {
      render(<TodoistSettings />);

      expect(screen.queryByText("Disconnect")).not.toBeInTheDocument();
    });

    it("does not show sync information when not connected", () => {
      render(<TodoistSettings />);

      expect(screen.queryByText("ℹ️ Sync Information")).not.toBeInTheDocument();
    });
  });

  describe("when connected to Todoist", () => {
    beforeEach(() => {
      vi.mocked(api.task.getTodoistStatus.useQuery).mockReturnValue({
        data: { connected: true },
      } as any);
    });

    it("renders the settings panel with connected status", () => {
      render(<TodoistSettings />);

      expect(screen.getByText("✅ Connected")).toBeInTheDocument();
      expect(screen.getByText("Update Token")).toBeInTheDocument();
    });

    it("shows correct placeholder text when connected", () => {
      render(<TodoistSettings />);

      const input = screen.getByPlaceholderText("Enter new token to update");
      expect(input).toBeInTheDocument();
    });

    it("shows disconnect button when connected", () => {
      render(<TodoistSettings />);

      expect(screen.getByText("Disconnect")).toBeInTheDocument();
    });

    it("shows sync information when connected", () => {
      render(<TodoistSettings />);

      expect(screen.getByText("ℹ️ Sync Information")).toBeInTheDocument();
      expect(
        screen.getByText(/Tasks created with "Sync to Todoist" enabled/),
      ).toBeInTheDocument();
    });
  });

  describe("token input functionality", () => {
    beforeEach(() => {
      vi.mocked(api.task.getTodoistStatus.useQuery).mockReturnValue({
        data: { connected: false },
      } as any);
    });

    it("allows typing in the token input", () => {
      render(<TodoistSettings />);

      const input = screen.getByPlaceholderText("Enter your Todoist API token");
      fireEvent.change(input, { target: { value: "test-token" } });

      expect(input).toHaveValue("test-token");
    });

    it("toggles token visibility when show/hide button is clicked", () => {
      render(<TodoistSettings />);

      const input = screen.getByPlaceholderText("Enter your Todoist API token");
      const toggleButton = screen.getByText("Show");

      expect(input).toHaveAttribute("type", "password");

      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");
      expect(screen.getByText("Hide")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Hide"));
      expect(input).toHaveAttribute("type", "password");
      expect(screen.getByText("Show")).toBeInTheDocument();
    });

    it("disables connect button when input is empty", () => {
      render(<TodoistSettings />);

      const connectButton = screen.getByText("Connect Todoist");
      expect(connectButton).toBeDisabled();
    });

    it("enables connect button when input has content", () => {
      render(<TodoistSettings />);

      const input = screen.getByPlaceholderText("Enter your Todoist API token");
      const connectButton = screen.getByText("Connect Todoist");

      fireEvent.change(input, { target: { value: "test-token" } });
      expect(connectButton).not.toBeDisabled();
    });
  });

  describe("token update functionality", () => {
    beforeEach(() => {
      vi.mocked(api.task.getTodoistStatus.useQuery).mockReturnValue({
        data: { connected: false },
      } as any);
    });

    it("calls updateToken mutation when connect button is clicked", () => {
      render(<TodoistSettings />);

      const input = screen.getByPlaceholderText("Enter your Todoist API token");
      const connectButton = screen.getByText("Connect Todoist");

      fireEvent.change(input, { target: { value: "test-token" } });
      fireEvent.click(connectButton);

      expect(mockUpdateToken.mutate).toHaveBeenCalledWith({
        token: "test-token",
      });
    });

    it("shows loading state when mutation is pending", () => {
      vi.mocked(api.task.updateTodoistToken.useMutation).mockReturnValue({
        ...mockUpdateToken,
        isPending: true,
      } as any);

      render(<TodoistSettings />);

      expect(screen.getByText("Updating...")).toBeInTheDocument();
      expect(screen.getByText("Updating...")).toBeDisabled();
    });
  });

  describe("disconnect functionality", () => {
    beforeEach(() => {
      vi.mocked(api.task.getTodoistStatus.useQuery).mockReturnValue({
        data: { connected: true },
      } as any);
    });

    it("shows confirmation dialog when disconnect is clicked", () => {
      vi.mocked(global.confirm).mockReturnValue(true);

      render(<TodoistSettings />);

      const disconnectButton = screen.getByText("Disconnect");
      fireEvent.click(disconnectButton);

      expect(global.confirm).toHaveBeenCalledWith(
        "Are you sure you want to disconnect Todoist?",
      );
      expect(mockUpdateToken.mutate).toHaveBeenCalledWith({ token: undefined });
    });

    it("does not disconnect when confirmation is cancelled", () => {
      vi.mocked(global.confirm).mockReturnValue(false);

      render(<TodoistSettings />);

      const disconnectButton = screen.getByText("Disconnect");
      fireEvent.click(disconnectButton);

      expect(global.confirm).toHaveBeenCalledWith(
        "Are you sure you want to disconnect Todoist?",
      );
      expect(mockUpdateToken.mutate).not.toHaveBeenCalled();
    });
  });

  describe("external link", () => {
    it("renders external link to Todoist settings", () => {
      render(<TodoistSettings />);

      const link = screen.getByText("Todoist Settings → Integrations");
      expect(link).toHaveAttribute(
        "href",
        "https://todoist.com/app/settings/integrations",
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
