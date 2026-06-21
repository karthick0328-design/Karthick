"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowRight,
  Filter,
  Calendar,
  Eye,
  Edit,
  Zap,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mail,
  Phone,
  Star,
  Target,
  Briefcase,
  User,
  LogOut,
  CreditCard,
  Rocket,
  MessageSquare,
  Send,
  X,
  Play,
  DollarSign,
  Receipt as ReceiptIcon,
  Sparkles,
  Search,
  Plus,
  Trash2,
  FilePlus,
  Check,
} from "lucide-react";
import Link from "next/link";
import ReceiptModal from "@/components/ReceiptModal";
// Redundant imports removed (Header, Sidebar)

interface DecodedToken {
  sub?: string;
  id?: string;
  role: string;
  department: string;
  exp: number;
  name?: string;
}

interface Message {
  _id?: string;
  senderId: {
    _id?: string;
    name: string;
    email: string;
    uniqueId: string;
    role: string;
  };
  content: string;
  timestamp: string;
  createdAt?: string;
}

interface BackendProject {
  _id: string;
  uniqueId: string;
  userId: { name: string; email: string; uniqueId: string };
  department: string;
  category: string;
  status: "Draft" | "Submitted" | "Under Review" | "In Progress" | "Completed";
  formData?: Record<string, unknown>;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  messages?: Array<Message>;
  activities?: Array<{
    description: string;
    timestamp: string;
    updatedBy: { name: string; role: string };
    statusChange?: string;
    remarks?: string;
  }>;
  paymentStatus:
  | "Pending"
  | "Quote Sent"
  | "Payment Form Created"
  | "Payment Submitted"
  | "Awaiting Approval"
  | "50% Paid"
  | "Official Receipt Issued"
  | "Full Paid";
  quotedAmount?: number;
  baseAmount?: number;
  gst?: number;
  taxHandling?: string;
  memberCost?: number;
  projectProgress?: string;
  paidAt?: string;
  paymentDetails?: {
    title?: string;
    projectDescription?: string;
    detailedQuotation?: string;
    dueDate?: string;
    amount?: number;
    paidAmount?: number;
    paymentMethod?: "Cash" | "Check" | "UPI";
    userSubmittedAt?: string;
    salesApprovedAt?: string;
    approvedBy?: { name: string };
    checkNumber?: string;
    bankName?: string;
    checkDate?: string;
    upiId?: string;
  };
  receipt?: { data: ReceiptData };
}

interface ReceiptData {
  receiptId: string;
  projectUniqueId: string;
  issuedAt: string;
  issuedBy: string;
  amount: number;
  items: any[];
  userDetails: {
    name: string;
    email: string;
    uniqueId: string;
    address?: string;
    gstin?: string;
    phone: string;
    branch?: string;
  };
  baseAmount: number;
  gst: number;
  taxHandling: string;
  memberCost: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  projectDetails: {
    title: string;
    description: string;
    quotation: string;
    department: string;
  };
}

interface MappedProject {
  id: string;
  uniqueId: string;
  title: string;
  department: string;
  status: "draft" | "submitted" | "under-review" | "in-progress" | "completed";
  createdAt: string;
  updatedAt: string;
  progress: number;
  priority: "low" | "medium" | "high";
  remarks?: string;
  messages?: Message[];
  activities?: BackendProject["activities"];
  paymentStatus: BackendProject["paymentStatus"];
  quotedAmount?: number;
  baseAmount?: number;
  gst?: number;
  taxHandling?: string;
  memberCost?: number;
  projectProgress?: string;
  paidAt?: string;
  paymentDetails?: BackendProject["paymentDetails"];
  paymentMethod?: "Cash" | "Check" | "UPI";
  remainingAmount?: number;
  receipt?: BackendProject["receipt"];
}

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") +
  "/api/projects";
const SOCKET_BASE =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
const PROJECTS_BASE_PATH = "/user/projects";

const UserDashboard = () => {
  const router = useRouter();
  const [user, setUser] = useState<{
    name: string;
    department: string;
    role: string;
    id: string;
  } | null>(null);
  const [projects, setProjects] = useState<MappedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    submitted: 0,
    inReview: 0,
    inProgress: 0,
    completed: 0,
  });
  const [showPaymentFormModal, setShowPaymentFormModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{
    data: ReceiptData;
  } | null>(null);
  const [selectedProjectForPayment, setSelectedProjectForPayment] =
    useState<MappedProject | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "Cash" | "Check" | "UPI" | null
  >(null);
  const [fullPayment, setFullPayment] = useState(false);
  const [paymentFormDetails, setPaymentFormDetails] = useState({
    checkNumber: "",
    bankName: "",
    checkDate: "",
    upiId: "",
  });
  const [paymentStep, setPaymentStep] = useState<number>(2);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<MappedProject | null>(
    null,
  );
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const currentProjectRef = useRef<string | null>(null);
  const projectsRef = useRef<MappedProject[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/Login/Signin");
      return;
    }
    tokenRef.current = token;
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        toast.error("Session expired. Please log in again.");
        router.push("/Login/Signin");
        return;
      }
      if (decoded.role === "manager") {
        router.push("/user-dashboard/Project");
        return;
      }
      const userName = decoded.name || "User";
      const newUser = {
        name: userName,
        department: "",
        role: decoded.role,
        id: decoded.id || decoded.sub || "",
      };
      setUser(newUser);
      loadProjectsData(token, newUser.id);
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("token");
      toast.error("Invalid session. Please log in again.");
      router.push("/Login/Signin");
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const socket = io(SOCKET_BASE, {
      auth: { token },
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      console.log("Socket connected");
      toast("Connected to real-time updates", { icon: "🔌", duration: 2000 });
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      toast("Reconnecting to real-time updates...", { duration: 2000 });
    });
    socket.on("connect_error", (error: any) => {
      console.error("Socket connection error:", error);
      toast.error("Connection error. Reconnecting...");
    });
    socket.on("quoteSent", (data: { amount: number; projectId: string }) => {
      setProjects((prev: MappedProject[]) =>
        prev.map((p) =>
          p.id === data.projectId
            ? {
              ...p,
              paymentStatus: "Quote Sent" as const,
              quotedAmount: data.amount,
            }
            : p,
        ),
      );
      toast(`New quote of $${data.amount} for your project!`, { icon: "💰" });
    });
    socket.on(
      "paymentFormCreatedBySales",
      (data: { projectId: string; paymentDetails: any }) => {
        setProjects((prev: MappedProject[]) =>
          prev.map((p) =>
            p.id === data.projectId
              ? {
                ...p,
                paymentStatus: "Payment Form Created" as const,
                paymentDetails: data.paymentDetails,
              }
              : p,
          ),
        );
        toast("Payment form created by SalesManager - ready for submission!", {
          icon: "📝",
        });
      },
    );
    socket.on(
      "paymentApproved",
      (data: {
        projectId: string;
        amount: number;
        method: string;
        fullPayment?: boolean;
      }) => {
        const status = data.fullPayment
          ? ("Full Paid" as const)
          : ("50% Paid" as const);
        const remaining = data.fullPayment
          ? 0
          : (projectsRef.current.find((p) => p.id === data.projectId)
            ?.quotedAmount || 0) * 0.5;
        setProjects((prev: MappedProject[]) =>
          prev.map((p) =>
            p.id === data.projectId
              ? {
                ...p,
                paymentStatus: status,
                paidAt: new Date().toISOString(),
                paymentMethod: data.method as "Cash" | "Check" | "UPI",
                remainingAmount: remaining,
              }
              : p,
          ),
        );
        toast.success(
          `${data.fullPayment ? "Full" : "Payment via"} ${data.method} approved!`,
        );
      },
    );
    socket.on(
      "receiptGenerated",
      (data: { receipt: { data: ReceiptData }; projectId: string }) => {
        const receipt = data.receipt;
        if (!receipt) return;
        const { data: receiptData } = receipt;
        setProjects((prev: MappedProject[]) =>
          prev.map((p) =>
            p.id === data.projectId
              ? {
                ...p,
                paymentStatus:
                  receiptData.remainingAmount === 0
                    ? ("Full Paid" as const)
                    : ("Official Receipt Issued" as const),
                receipt: data.receipt,
                remainingAmount: receiptData.remainingAmount,
              }
              : p,
          ),
        );
        toast.success("Official Receipt generated - check details below!");
      },
    );
    socket.on(
      "notification",
      (data: { title: string; message: string; type?: string }) => {
        toast(data.message, {
          icon: data.title.includes("Payment") ? "⚠️" : "🔔",
          duration: 5000,
          style: {
            background: data.title.includes("Payment") ? "#fff5f5" : "#ffffff",
            color: data.title.includes("Payment") ? "#c53030" : "#2d3748",
            border: data.title.includes("Payment")
              ? "1px solid #feb2b2"
              : "1px solid #e2e8f0",
          },
        });
      },
    );
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;
    const handleNewMessage = (data: {
      message: Message;
      projectId: string;
    }) => {
      // Safe navigation for data.message and senderId
      if (
        !data?.message?.senderId?._id ||
        data.message.senderId._id === user?.id
      )
        return;
      const sortedMessage = data.message;
      setProjects((prevProjects: MappedProject[]) =>
        prevProjects.map((p) =>
          p.id === data.projectId
            ? {
              ...p,
              messages: [...(p.messages || []), sortedMessage].sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime(),
              ),
            }
            : p,
        ),
      );
      if (currentProjectRef.current === data.projectId) {
        setChatMessages((prev: Message[]) => {
          const updated = [...prev, sortedMessage];
          return updated.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
        });
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.projectId]: (prev[data.projectId] || 0) + 1,
        }));
        // Safe navigation for project lookup
        const projectTitle =
          projectsRef.current.find((p) => p.id === data.projectId)?.title ||
          "Project";
        toast(`New message in "${projectTitle}"!`, { duration: 3000 });
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [user]);

  const joinAllProjectRooms = () => {
    const socket = socketRef.current;
    if (!socket || projects.length === 0) return;
    projects.forEach((project) => {
      if (
        ["under-review", "in-progress", "completed"].includes(project.status)
      ) {
        socket.emit("joinProjectRoom", project.id);
        console.log(`Joined project room: ${project.id}`);
      }
    });
  };

  const leaveAllProjectRooms = () => {
    const socket = socketRef.current;
    if (!socket || projects.length === 0) return;
    projects.forEach((project) => {
      if (
        ["under-review", "in-progress", "completed"].includes(project.status)
      ) {
        socket.emit("leaveProjectRoom", project.id);
        console.log(`Left project room: ${project.id}`);
      }
    });
    currentProjectRef.current = null;
  };

  useEffect(() => {
    return () => {
      leaveAllProjectRooms();
    };
  }, [projects]);

  const loadProjectsData = async (token: string, userIdParam?: string) => {
    const currentUserId = userIdParam || user?.id;
    if (!currentUserId) {
      setError("User ID not available");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `${API_BASE}/my-projects`;
      console.log("Fetching from:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Full response error:", errorText);
        if (response.status === 404) {
          throw new Error(
            "API endpoint not found. Ensure backend server is running and routes are mounted.",
          );
        }
        throw new Error(
          `API Error: ${response.status} - ${response.statusText}`,
        );
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch projects");
      }
      const backendProjects: BackendProject[] = data.data || [];
      // Filter out any null/undefined projects before mapping
      const mappedProjects = backendProjects
        .filter((bp) => bp && bp._id)
        .map(mapBackendToFrontend);
      const initialUnread: Record<string, number> = {};
      mappedProjects.forEach((p) => {
        // Safe navigation for messages and senderId
        initialUnread[p.id] =
          p.messages?.filter(
            (m) => m?.senderId?._id && m.senderId._id !== currentUserId,
          ).length || 0;
      });
      setProjects(mappedProjects);
      setUnreadCounts(initialUnread);
      calculateStats(mappedProjects);
      joinAllProjectRooms();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error fetching projects";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (
    projectId: string,
    method: "Cash" | "Check" | "UPI",
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token");
      const body: any = {
        paymentMethod: method,
        fullPayment,
      };
      if (method === "Check") {
        const { checkNumber, bankName, checkDate } = paymentFormDetails;
        if (!checkNumber || !bankName || !checkDate) {
          throw new Error("All Check details are required");
        }
        body.checkNumber = checkNumber;
        body.bankName = bankName;
        body.checkDate = checkDate;
      } else if (method === "UPI") {
        const { upiId } = paymentFormDetails;
        if (!upiId) {
          throw new Error("UPI ID is required");
        }
        body.upiId = upiId;
      }
      const response = await fetch(`${API_BASE}/${projectId}/submit-payment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        const paymentType = fullPayment ? "Full" : "50%";
        if (method === "UPI") {
          toast.success(`${paymentType} payment confirmed via UPI!`);
        } else {
          toast.success(
            `${paymentType} payment submitted via ${method} - awaiting approval`,
          );
        }
        loadProjectsData(token, user?.id);
        closePaymentFormModal();
      } else {
        throw new Error(data.message || "Submission failed");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Error submitting payment";
      toast.error(errorMsg);
    }
  };

  const submitBalancePayment = async (
    projectId: string,
    method: "Cash" | "Check" | "UPI",
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token");
      const body: any = {
        paymentMethod: method,
      };
      if (method === "Check") {
        const { checkNumber, bankName, checkDate } = paymentFormDetails;
        if (!checkNumber || !bankName || !checkDate) {
          throw new Error("All Check details are required");
        }
        body.checkNumber = checkNumber;
        body.bankName = bankName;
        body.checkDate = checkDate;
      } else if (method === "UPI") {
        const { upiId } = paymentFormDetails;
        if (!upiId) {
          throw new Error("UPI ID is required");
        }
        body.upiId = upiId;
      }
      const response = await fetch(
        `${API_BASE}/${projectId}/submit-balance-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        if (method === "UPI") {
          toast.success("Balance payment confirmed via UPI!");
        } else {
          toast.success(
            `Balance payment submitted via ${method} - awaiting approval`,
          );
        }
        loadProjectsData(token, user?.id);
        closePaymentFormModal();
      } else {
        throw new Error(data.message || "Submission failed");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Error submitting balance payment";
      toast.error(errorMsg);
    }
  };

  const handlePaymentMethodChange = (method: "Cash" | "Check" | "UPI") => {
    setSelectedPaymentMethod(method);
    setPaymentFormDetails({
      checkNumber: "",
      bankName: "",
      checkDate: "",
      upiId: "",
    });
  };

  const toggleFullPayment = () => {
    setFullPayment(!fullPayment);
  };

  const openPaymentForm = (project: MappedProject) => {
    setSelectedProjectForPayment(project);
    setSelectedPaymentMethod(null);
    setFullPayment(false);
    setPaymentFormDetails({
      checkNumber: "",
      bankName: "",
      checkDate: "",
      upiId: "",
    });
    setPaymentStep(2);
    setShowPaymentFormModal(true);
  };

  const openReceipt = (receipt: NonNullable<BackendProject["receipt"]>) => {
    if (!receipt.data) {
      toast.error("Invalid receipt data. Please refresh and try again.");
      return;
    }
    const data = receipt.data;
    const paidAmount = data.paidAmount ?? 0;
    const remainingAmount = data.remainingAmount ?? 0;
    if (typeof paidAmount !== "number" || typeof remainingAmount !== "number") {
      console.warn(
        "Receipt validation warning: Using fallbacks for paid/remaining amounts",
        { paidAmount, remainingAmount, data },
      );
      toast(
        "Receipt data incomplete - using defaults. Refresh if issues persist.",
        {
          icon: "⚠️",
          style: {
            background: "#fff3cd",
            color: "#856404",
            border: "1px solid #ffeaa7",
          },
        },
      );
    }
    const totalAmount = paidAmount + remainingAmount;
    const patchedData = {
      ...data,
      paidAmount,
      remainingAmount,
      amount: totalAmount,
    };
    setSelectedReceipt({ ...receipt, data: patchedData });
    setShowReceiptModal(true);
  };


  const resetUnreadCount = (projectId: string) => {
    setUnreadCounts((prev: Record<string, number>) => ({ ...prev, [projectId]: 0 }));
  };

  const loadChatMessages = async (projectId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE}/${projectId}/messages`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to load messages");
      const data = await response.json();
      if (data.success) {
        const sortedMessages = (data.data?.messages || []).sort(
          (
            a: { timestamp: string | number | Date },
            b: { timestamp: string | number | Date },
          ) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setChatMessages(sortedMessages);
        setProjects((prev: MappedProject[]) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, messages: sortedMessages } : p,
          ),
        );
      }
    } catch (err) {
      toast.error("Error loading chat");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;
    setSendingMessage(true);
    const content = newMessage.trim();
    const projectId = selectedProject.id;
    const tempId = Date.now().toString();
    const optimisticMessage: Message = {
      _id: tempId,
      senderId: {
        _id: user!.id,
        name: user!.name,
        email: "",
        uniqueId: "",
        role: user!.role,
      },
      content,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev: Message[]) => {
      const updated = [...prev, optimisticMessage];
      return updated.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    });
    setProjects((prevProjects: MappedProject[]) =>
      prevProjects.map((p) =>
        p.id === projectId
          ? {
            ...p,
            messages: [...(p.messages || []), optimisticMessage].sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            ),
          }
          : p,
      ),
    );
    setNewMessage("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token");
      const response = await fetch(`${API_BASE}/${projectId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.success || !data.data || !data.data.message) {
        throw new Error("Invalid response from server");
      }
      const serverMessage = data.data.message;
      setChatMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? serverMessage : msg)),
      );
      setProjects((prevProjects: MappedProject[]) =>
        prevProjects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              messages: p.messages?.map((msg) =>
                msg._id === tempId ? serverMessage : msg,
              ) || [serverMessage],
            }
            : p,
        ),
      );
      toast("Message sent!", { icon: "📨" });
    } catch (err) {
      setChatMessages((prev: Message[]) => prev.filter((msg) => msg._id !== tempId));
      setProjects((prevProjects: MappedProject[]) =>
        prevProjects.map((p) =>
          p.id === projectId
            ? {
              ...p,
              messages: p.messages?.filter((msg) => msg._id !== tempId),
            }
            : p,
        ),
      );
      const errorMsg =
        err instanceof Error ? err.message : "Error sending message";
      toast.error(errorMsg);
      setNewMessage(content);
    } finally {
      setSendingMessage(false);
    }
  };

  const mapBackendToFrontend = (backend: BackendProject): MappedProject => {
    let title = backend.category || "Untitled Project";
    if (backend.formData && backend.department) {
      const titleFields: Record<string, string> = {
        "Drug Discovery": "titleProject",
        NGS: "sampleName",
        "Software Development": "projectName",
        Microbiology: "sampleName",
        "Biochemistry and Molecular Biology": "sampleName",
      };
      const preferredField = titleFields[backend.department];
      if (
        preferredField &&
        typeof backend.formData[preferredField] === "string"
      ) {
        title = backend.formData[preferredField] as string;
      } else {
        const firstField = Object.values(backend.formData || {})[0];
        title = typeof firstField === "string" ? firstField : title;
      }
    } else if (backend.paymentDetails?.title) {
      title = backend.paymentDetails.title;
    }
    let status: MappedProject["status"];
    switch (backend.status) {
      case "Draft":
        status = "draft";
        break;
      case "Submitted":
        status = "submitted";
        break;
      case "Under Review":
        status = "under-review";
        break;
      case "In Progress":
        status = "in-progress";
        break;
      case "Completed":
        status = "completed";
        break;
      default:
        status = "draft";
    }
    let progress = 0;
    // Prio 1: Backend explicit progress if it's a valid number string
    const explicitProgress = parseInt(backend.projectProgress || "");
    if (!isNaN(explicitProgress)) {
      progress = Math.min(Math.max(explicitProgress, 0), 100);
    } else {
      // Prio 2: Status-based mapping
      if (status === "draft") progress = 10;
      else if (status === "submitted") progress = 25;
      else if (status === "under-review") progress = 50;
      else if (status === "in-progress") progress = 75;
      else if (status === "completed") progress = 100;
    }
    // Final check: Completed status must be 100%
    if (status === "completed") progress = 100;
    const priority: MappedProject["priority"] = "medium";
    const sortedMessages = backend.messages
      ? [...backend.messages].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      : undefined;
    const sortedActivities = backend.activities
      ? [...backend.activities].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      : undefined;
    const total = backend.paymentDetails?.amount || backend.quotedAmount || 0;
    const paid = backend.paymentDetails?.paidAmount || 0;
    const remaining = total - paid;
    return {
      id: backend._id,
      uniqueId: backend.uniqueId,
      title,
      department: backend.department,
      status,
      createdAt: backend.createdAt,
      updatedAt: backend.updatedAt || backend.createdAt,
      progress,
      priority,
      remarks: backend.remarks,
      messages: sortedMessages,
      activities: sortedActivities,
      paymentStatus: backend.paymentStatus,
      quotedAmount: backend.quotedAmount,
      baseAmount: backend.baseAmount,
      gst: backend.gst,
      taxHandling: backend.taxHandling,
      memberCost: backend.memberCost,
      projectProgress: backend.projectProgress,
      paidAt: backend.paidAt,
      paymentDetails: backend.paymentDetails,
      paymentMethod: backend.paymentDetails?.paymentMethod,
      remainingAmount: remaining,
      receipt: backend.receipt,
    };
  };

  const calculateStats = (projectsData: MappedProject[]) => {
    const stats = {
      total: projectsData.length,
      drafts: projectsData.filter((p) => p.status === "draft").length,
      submitted: projectsData.filter((p) => p.status === "submitted").length,
      inReview: projectsData.filter((p) => p.status === "under-review").length,
      inProgress: projectsData.filter((p) => p.status === "in-progress").length,
      completed: projectsData.filter((p) => p.status === "completed").length,
    };
    setStats(stats);
  };

  const getStatusIcon = (status: MappedProject["status"]) => {
    switch (status) {
      case "draft":
        return <Edit className="w-4 h-4" />;
      case "submitted":
        return <Rocket className="w-4 h-4" />;
      case "under-review":
        return <Search className="w-4 h-4" />;
      case "in-progress":
        return <Sparkles className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: MappedProject["status"]) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "submitted":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "under-review":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "in-progress":
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case "completed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default:
        return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  const getPaymentBadge = (project: MappedProject) => {
    const { paymentStatus, quotedAmount, paymentMethod } = project;
    let config = {
      bgColor: "bg-slate-100",
      textColor: "text-slate-600",
      icon: <DollarSign className="w-3.5 h-3.5" />,
      text: "Pending",
    };

    switch (paymentStatus) {
      case "Quote Sent":
        config = {
          bgColor: "bg-amber-50",
          textColor: "text-amber-600",
          icon: <DollarSign className="w-3.5 h-3.5" />,
          text: `Quote: $${quotedAmount}`,
        };
        break;
      case "Payment Form Created":
        config = {
          bgColor: "bg-orange-50",
          textColor: "text-orange-600",
          icon: <FilePlus className="w-3.5 h-3.5" />,
          text: "Form Ready",
        };
        break;
      case "Payment Submitted":
        config = {
          bgColor: "bg-purple-50",
          textColor: "text-purple-600",
          icon: <CreditCard className="w-3.5 h-3.5" />,
          text: "Submitted",
        };
        break;
      case "Awaiting Approval":
        config = {
          bgColor: "bg-rose-50",
          textColor: "text-rose-600",
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          text: "Under Verification",
        };
        break;
      case "50% Paid":
        config = {
          bgColor: "bg-blue-50",
          textColor: "text-blue-600",
          icon: <Check className="w-3.5 h-3.5" />,
          text: "50% Confirmed",
        };
        break;
      case "Official Receipt Issued":
        config = {
          bgColor: "bg-emerald-50",
          textColor: "text-emerald-600",
          icon: <ReceiptIcon className="w-3.5 h-3.5" />,
          text: "Official Receipt Ready",
        };
        break;
      case "Full Paid":
        config = {
          bgColor: "bg-green-500",
          textColor: "text-white",
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          text: "Fully Paid",
        };
        break;
    }

    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${config.bgColor} ${config.textColor} font-bold text-[11px] uppercase tracking-wider shadow-sm border border-black/5`}
      >
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };

  const getBalanceDisplay = (project: MappedProject) => {
    if (
      project.paymentStatus === "Official Receipt Issued" &&
      project.remainingAmount !== undefined &&
      project.remainingAmount > 0
    ) {
      return (
        <div className="mt-4 flex items-center gap-3 bg-rose-50/50 border border-rose-100/50 px-4 py-2 rounded-2xl w-fit">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
            Outstanding: ${project.remainingAmount.toFixed(2)}
          </span>
        </div>
      );
    }
    return null;
  };

  const getPaymentActions = (project: MappedProject) => {
    const { paymentStatus, remainingAmount, receipt } = project;
    return (
      <div className="flex items-center gap-3">
        {paymentStatus === "Quote Sent" && (
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openChat(project)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-white transition-all duration-500 whitespace-nowrap shadow-sm border border-indigo-100/50"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Request Form</span>
          </motion.button>
        )}
        {paymentStatus === "Payment Form Created" && (
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openPaymentForm(project)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all duration-500 whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4" />
            <span>Authorize Payment</span>
          </motion.button>
        )}
        {paymentStatus === "Official Receipt Issued" &&
          remainingAmount &&
          remainingAmount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openPaymentForm(project)}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all duration-500 whitespace-nowrap"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Balance</span>
            </motion.button>
          )}
        {(paymentStatus === "Official Receipt Issued" ||
          paymentStatus === "Full Paid") &&
          receipt && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: 8 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => openReceipt(receipt)}
              className="flex items-center justify-center w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all duration-500 border border-emerald-100 shadow-sm"
              title="View Official Receipt"
            >
              <ReceiptIcon className="w-6 h-6" />
            </motion.button>
          )}

      </div>
    );
  };

  const getPriorityColor = (priority: MappedProject["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openChat = async (project: MappedProject) => {
    if (
      ["under-review", "in-progress", "completed"].includes(project.status) ||
      [
        "Quote Sent",
        "Payment Form Created",
        "Payment Submitted",
        "Awaiting Approval",
        "50% Paid",
        "Official Receipt Issued",
        "Full Paid",
      ].includes(project.paymentStatus)
    ) {
      setSelectedProject(project);
      resetUnreadCount(project.id);
      const token = localStorage.getItem("token");
      await loadChatMessages(project.id, token!);
      const socket = socketRef.current;
      if (socket) {
        socket.emit("joinProjectRoom", project.id);
        currentProjectRef.current = project.id;
      }
      setChatOpen(true);
    } else {
      toast.error("Chat available only after quoting or assignment");
    }
  };

  const closeChat = () => {
    const socket = socketRef.current;
    if (socket && currentProjectRef.current) {
      socket.emit("leaveProjectRoom", currentProjectRef.current);
      currentProjectRef.current = null;
    }
    setChatOpen(false);
    setSelectedProject(null);
    setChatMessages([]);
    setNewMessage("");
  };

  const closePaymentFormModal = () => {
    setShowPaymentFormModal(false);
    setSelectedProjectForPayment(null);
    setSelectedPaymentMethod(null);
    setFullPayment(false);
    setPaymentStep(2);
    setPaymentFormDetails({
      checkNumber: "",
      bankName: "",
      checkDate: "",
      upiId: "",
    });
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedReceipt(null);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-2xl animate-spin shadow-xl"></div>
        </div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
          Initializing Profile...
        </p>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-[2.5rem] p-12 shadow-sm border border-slate-100 max-w-md">
          <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            Sync Error
          </h2>
          <p className="text-slate-400 font-bold mb-10 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() =>
              loadProjectsData(localStorage.getItem("token") || "", user?.id)
            }
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            Retry Protocol
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="animate-in fade-in duration-500">
        <Toaster
          position="top-right"
          toastOptions={{
            className: "bg-white border border-gray-200 shadow-xl rounded-2xl",
            duration: 4000,
          }}
        />
        <div className="w-full flex-1 space-y-6 px-6 flex flex-col pt-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                  Project <span className="text-indigo-600">Portfolio</span>
                </h1>
                <p className="text-slate-400 font-bold max-w-sm text-sm">
                  A centralized manifest of your operational sequences and
                  research collaborations.
                </p>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={`/user-dashboard/Project/new-project`}
                  className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-black transition-all shadow-lg shadow-slate-200 group"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                  <span>New Project</span>
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                label: "TOTAL PROJECTS",
                value: stats.total,
                icon: FileText,
                bg: "bg-indigo-600",
                iconBg: "bg-white/20",
              },
              {
                label: "IN REVIEW",
                value: stats.inReview,
                icon: Eye,
                bg: "bg-amber-500",
                iconBg: "bg-white/20",
              },
              {
                label: "SUBMITTED",
                value: stats.submitted,
                icon: Clock,
                bg: "bg-blue-500",
                iconBg: "bg-white/20",
              },
              {
                label: "ACTIVE PROJECTS",
                value: stats.inProgress,
                icon: Play,
                bg: "bg-emerald-500",
                iconBg: "bg-white/20",
              },
              {
                label: "COMPLETED",
                value: stats.completed,
                icon: CheckCircle,
                bg: "bg-slate-800",
                iconBg: "bg-white/20",
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                className={`${stat.bg} rounded-[2rem] p-5 shadow-lg shadow-slate-200/50 hover:scale-[1.02] transition-all duration-500 group flex flex-col items-center text-center relative overflow-hidden`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.iconBg} text-white flex items-center justify-center mb-4 transition-all group-hover:rotate-12 duration-500 shadow-sm border border-white/10 backdrop-blur-md`}
                >
                  <stat.icon size={22} />
                </div>

                <span className="text-2xl font-black text-white tracking-tighter mb-1 relative z-10">
                  {stat.value}
                </span>

                <h3 className="text-[9px] font-black text-white/80 uppercase tracking-[0.1em] relative z-10 whitespace-nowrap">
                  {stat.label}
                </h3>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              </motion.div>
            ))}
          </div>
          <div className="w-full">
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-visible">
              <div className="px-8 pt-6 pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      Operational Matrix
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                      <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search entities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-50 w-full md:w-60 transition-all outline-none"
                      />
                    </div>
                    <div className="relative group">
                      <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors pointer-events-none" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-10 pr-8 py-3 bg-white border border-slate-100 text-slate-600 rounded-xl focus:ring-4 focus:ring-indigo-50 font-black uppercase tracking-widest text-[10px] outline-none appearance-none cursor-pointer"
                      >
                        <option value="all">Global Manifest</option>
                        <option value="draft">Draft Phase</option>
                        <option value="submitted">Submitted Sync</option>
                        <option value="under-review">Reviewing</option>
                        <option value="in-progress">In Development</option>
                        <option value="completed">Operational</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative">
                      <div className="w-20 h-20 border-[6px] border-slate-100 border-t-indigo-600 rounded-3xl animate-spin shadow-2xl"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-indigo-600 animate-pulse" />
                      </div>
                    </div>
                    <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">
                      Synchronizing Matrix...
                    </p>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-32 bg-slate-50/30 rounded-[3rem] border-2 border-dashed border-slate-100">
                    <div className="bg-white w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200/50 border border-slate-50">
                      <FileText className="w-12 h-12 text-slate-200" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                      No Entities Detected
                    </h3>
                    <p className="text-slate-400 font-bold mb-12 max-w-sm mx-auto text-sm leading-relaxed text-balance px-4">
                      Initialize your first operational sequence to start
                      collaborating with our team of elite biological experts.
                    </p>
                    <Link
                      href={`/user-dashboard/Project/new-project`}
                      className="inline-flex items-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all shadow-2xl shadow-slate-300 group active:scale-95"
                    >
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                      <span>Initialize Protocol</span>
                    </Link>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 custom-scrollbar overflow-x-hidden">
                    <table className="w-full text-left border-separate border-spacing-y-2.5">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="sticky top-0 z-30 bg-slate-800 py-4 px-4 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 first:rounded-tl-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                            Sequence Identification
                          </th>
                          <th className="sticky top-0 z-30 bg-slate-800 py-4 px-3 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5">
                            Operational Status
                          </th>
                          <th className="sticky top-0 z-30 bg-slate-800 py-4 px-3 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5">
                            Developmental Sync
                          </th>
                          <th className="sticky top-0 z-30 bg-slate-800 py-4 px-3 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5">
                            Financial Status
                          </th>
                          <th className="sticky top-0 z-30 bg-slate-800 py-4 px-4 text-right text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 last:rounded-tr-2xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                            Matrix Control
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence mode="popLayout">
                          {filteredProjects.map((project, idx) => {
                            const unread = unreadCounts[project.id] || 0;
                            return (
                              <motion.tr
                                layout
                                key={project.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="group bg-white hover:bg-slate-50/50 transition-all duration-500"
                              >
                                <td className="py-4 px-4 rounded-l-[1.5rem] border-y border-l border-slate-50 group-hover:border-indigo-100 transition-colors">
                                  <Link
                                    href={`/user-dashboard/Project/${project.id}/view`}
                                    className="flex items-center gap-3 group/link"
                                  >
                                    <div
                                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getStatusColor(project.status).split(" ")[0]} ${getStatusColor(project.status).split(" ")[1]} shadow-sm border border-white group-hover/link:scale-110 group-hover/link:rotate-3 transition-transform duration-500`}
                                    >
                                      {getStatusIcon(project.status)}
                                    </div>
                                    <div className="min-w-0 max-w-[250px] xl:max-w-[400px] border-l-[4px] border-indigo-600 pl-3 py-0.5">
                                      <h4 className="font-black text-slate-900 text-sm xl:text-base tracking-tight truncate group-hover/link:text-indigo-600 transition-colors uppercase leading-tight">
                                        {project.title}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <p className="text-[9px] font-black text-slate-300 uppercase">
                                          ID:{" "}
                                          {project.uniqueId || project.id.toUpperCase()}
                                        </p>
                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded-lg border border-slate-100">
                                          <Briefcase
                                            size={9}
                                            className="text-indigo-400"
                                          />
                                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            {project.department}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                </td>
                                <td className="py-4 px-3 border-y border-slate-50 group-hover:border-indigo-100 transition-colors">
                                  <div className="flex flex-col gap-1.5">
                                    <span
                                      className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/50 inline-flex w-fit ${getStatusColor(project.status)}`}
                                    >
                                      {project.status.replace("-", " ")}
                                    </span>
                                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none pl-1">
                                      Last sync:{" "}
                                      {new Date(
                                        project.updatedAt,
                                      ).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </p>
                                  </div>
                                </td>
                                <td className="py-4 px-3 border-y border-slate-50 group-hover:border-indigo-100 transition-colors">
                                  {(() => {
                                    const isStarted = ["in-progress", "completed"].includes(project.status);
                                    const syncColor = isStarted ? "bg-indigo-600" : "bg-amber-400";
                                    const syncText = isStarted ? "text-indigo-600" : "text-amber-600";
                                    const syncShadow = isStarted ? "rgba(79,70,229,0.3)" : "rgba(251,191,36,0.3)";
                                    const syncLabel = isStarted ? "Operational Sync" : "Financial Sync";

                                    return (
                                      <div className="w-28">
                                        <div className="flex justify-between items-center mb-1 px-1">
                                          <span className={`text-[9px] font-black ${syncText} uppercase tracking-widest`}>
                                            {project.progress}%
                                          </span>
                                          <span className={`text-[7px] font-black ${syncText} uppercase tracking-tight opacity-70`}>
                                            {syncLabel}
                                          </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-white">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{
                                              width: `${project.progress}%`,
                                            }}
                                            transition={{
                                              duration: 1.5,
                                              ease: "circOut",
                                            }}
                                            className={`h-full ${syncColor} rounded-full`}
                                            style={{ boxShadow: `0 0 12px ${syncShadow}` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="py-4 px-3 border-y border-slate-50 group-hover:border-indigo-100 transition-colors">
                                  <div className="flex flex-col gap-1">
                                    {project.paymentStatus === "Pending" ? (
                                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic tracking-[0.1em]">
                                        Awaiting Init
                                      </span>
                                    ) : (
                                      <>
                                        <div className="scale-[0.85] origin-left">
                                          {getPaymentBadge(project)}
                                        </div>
                                        {getBalanceDisplay(project)}
                                      </>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4 rounded-r-[1.5rem] border-y border-r border-slate-50 group-hover:border-indigo-100 transition-colors text-right">
                                  <div className="flex items-center justify-end gap-3">
                                    {getPaymentActions(project)}
                                    {([
                                      "under-review",
                                      "in-progress",
                                      "completed",
                                    ].includes(project.status) ||
                                      [
                                        "Quote Sent",
                                        "Payment Form Created",
                                        "Payment Submitted",
                                        "Awaiting Approval",
                                        "50% Paid",
                                        "Official Receipt Issued",
                                        "Full Paid",
                                      ].includes(project.paymentStatus)) && (
                                        <motion.button
                                          whileHover={{ scale: 1.1, y: -2 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => openChat(project)}
                                          className="w-12 h-12 flex items-center justify-center bg-white text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all relative border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100 duration-500"
                                        >
                                          <MessageSquare className="w-5 h-5" />
                                          {unread > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-lg px-1.5 py-0.5 text-[10px] font-black shadow-lg ring-4 ring-white">
                                              {unread > 9 ? "9+" : unread}
                                            </span>
                                          )}
                                        </motion.button>
                                      )}
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {chatOpen && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 lg:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-5">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100`}
                  >
                    {getStatusIcon(selectedProject.status)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {selectedProject.title}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      Project Coordination
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeChat}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-8">
                    <div className="w-24 h-24 bg-white rounded-[3rem] flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                      <MessageSquare className="w-10 h-10 text-indigo-200" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                      Initialize Communication
                    </h4>
                    <p className="text-slate-400 font-bold max-w-xs leading-relaxed text-sm">
                      Establish a direct link with our project coordinators for
                      real-time synchronization.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {[...chatMessages]
                      .filter((m) => !m.content.includes("[ESCALATED TO HR]"))
                      .reverse()
                      .map((msg, index) => {
                        const isOwn = msg.senderId?._id === user?.id;
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={msg._id || index}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[80%]`}
                            >
                              {!isOwn && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  {msg.senderId.name} • {msg.senderId.role}
                                </span>
                              )}
                              <div
                                className={`px-6 py-4 rounded-[2rem] text-sm font-bold leading-relaxed shadow-sm ${isOwn
                                  ? "bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-100"
                                  : "bg-white text-slate-900 rounded-tl-none border border-slate-100 shadow-xl shadow-slate-100/20"
                                  }`}
                              >
                                {msg.content}
                              </div>
                              <span
                                className={`text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 ${isOwn ? "mr-4" : "ml-4"}`}
                              >
                                {(() => {
                                  const d = new Date(
                                    msg.timestamp ||
                                    msg.createdAt ||
                                    Date.now(),
                                  );
                                  const now = new Date();
                                  const isToday =
                                    d.toDateString() === now.toDateString();
                                  const yesterday = new Date();
                                  yesterday.setDate(yesterday.getDate() - 1);
                                  const isYesterday =
                                    d.toDateString() ===
                                    yesterday.toDateString();
                                  const time = d.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                  if (isToday) return `Today, ${time}`;
                                  if (isYesterday) return `Yesterday, ${time}`;
                                  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
                                })()}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-10 bg-white border-t border-slate-100">
                <div className="relative flex items-center gap-5">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Dispatch secure message..."
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-10 py-5 text-slate-900 font-bold focus:ring-4 focus:ring-indigo-50 placeholder:text-slate-300 transition-all outline-none"
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    disabled={sendingMessage}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    disabled={sendingMessage || newMessage.trim().length === 0}
                    className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center disabled:opacity-30 shadow-xl shadow-slate-200 hover:bg-black transition-all group"
                  >
                    {sendingMessage ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPaymentFormModal && selectedProjectForPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm flex items-center justify-center z-[110] p-4 lg:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedProjectForPayment.paymentStatus ===
                      "Official Receipt Issued"
                      ? "Settle Balance"
                      : "Project Investment"}
                  </h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                    Industrial Grade Security
                  </p>
                </div>
                <button
                  onClick={closePaymentFormModal}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50">
                      <DollarSign className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">
                        Project Intelligence
                      </p>
                      <h4 className="text-lg font-black text-slate-900 leading-none">
                        {selectedProjectForPayment.title}
                      </h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200/60">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Full Commitment
                      </p>
                      <p className="text-2xl font-black text-slate-900 leading-none">
                        ${selectedProjectForPayment?.quotedAmount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 font-black">
                        {selectedProjectForPayment?.paymentStatus ===
                          "Official Receipt Issued"
                          ? "Remaining Owed"
                          : fullPayment
                            ? "Full Payment"
                            : "Initial Deposit"}
                      </p>
                      <p className="text-2xl font-black text-indigo-600 leading-none">
                        $
                        {selectedProjectForPayment?.paymentStatus ===
                          "Official Receipt Issued"
                          ? (
                            selectedProjectForPayment?.remainingAmount || 0
                          ).toFixed(2)
                          : (fullPayment
                            ? selectedProjectForPayment?.quotedAmount || 0
                            : (selectedProjectForPayment?.quotedAmount || 0) *
                            0.5
                          ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {selectedProjectForPayment?.paymentStatus !==
                    "Official Receipt Issued" && (
                      <div className="pt-6 border-t border-slate-200/60 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                            Payment Option
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {fullPayment ? "Full Amount" : "50% Partial Payment"}
                          </p>
                        </div>
                        <button
                          onClick={() => setFullPayment(!fullPayment)}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${fullPayment ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${fullPayment ? "translate-x-8" : "translate-x-1"
                              }`}
                          />
                        </button>
                      </div>
                    )}
                </div>

                {selectedProjectForPayment?.paymentDetails && (
                  <div className="space-y-4">
                    <h5 className="text-sm font-black text-[#1a1c21] uppercase tracking-widest ml-1">
                      Payment Schedule
                    </h5>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-sm font-bold text-[#1a1c21]">
                              Due Date
                            </p>
                            <p className="text-xs text-[#64748b] font-medium">
                              {
                                selectedProjectForPayment?.paymentDetails
                                  ?.dueDate
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="text-sm font-black text-[#1a1c21] uppercase tracking-widest ml-1">
                    Select Payment Method
                  </h5>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        id: "UPI",
                        label: "UPI Payment",
                        desc: "Secure & Instant confirmation",
                        icon: Sparkles,
                      },
                      {
                        id: "Check",
                        label: "Bank Check",
                        desc: "Processing takes 2-3 business days",
                        icon: FileText,
                      },
                      {
                        id: "Cash",
                        label: "Office Cash",
                        desc: "Collect at nearest service branch",
                        icon: DollarSign,
                      },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() =>
                          handlePaymentMethodChange(method.id as any)
                        }
                        className={`group p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 ${selectedPaymentMethod === method.id
                          ? "border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100"
                          : "border-slate-50 bg-slate-50 hover:bg-white hover:border-slate-200"
                          }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedPaymentMethod === method.id
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "bg-white text-slate-400 group-hover:text-slate-600 shadow-sm"
                            }`}
                        >
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-sm font-black uppercase tracking-widest ${selectedPaymentMethod === method.id ? "text-slate-900" : "text-slate-600"}`}
                          >
                            {method.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {method.desc}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedPaymentMethod === method.id
                            ? "border-indigo-600 bg-indigo-600"
                            : "border-slate-200"
                            }`}
                        >
                          {selectedPaymentMethod === method.id && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPaymentMethod && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-10 rounded-[2.5rem] bg-indigo-50/30 border border-indigo-100 space-y-6"
                  >
                    {selectedPaymentMethod === "Check" && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                            Check Identification
                          </label>
                          <input
                            type="text"
                            placeholder="TRANS_CHECK_0000"
                            value={paymentFormDetails.checkNumber}
                            onChange={(e) =>
                              setPaymentFormDetails((prev: typeof paymentFormDetails) => ({
                                ...prev,
                                checkNumber: e.target.value,
                              }))
                            }
                            className="w-full px-8 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-200 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                            Issuing Institution
                          </label>
                          <input
                            type="text"
                            placeholder="Central Reserve Bank"
                            value={paymentFormDetails.bankName}
                            onChange={(e) =>
                              setPaymentFormDetails((prev: typeof paymentFormDetails) => ({
                                ...prev,
                                bankName: e.target.value,
                              }))
                            }
                            className="w-full px-8 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-200 transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                            Authorized Date
                          </label>
                          <input
                            type="date"
                            value={paymentFormDetails.checkDate}
                            onChange={(e) =>
                              setPaymentFormDetails((prev: typeof paymentFormDetails) => ({
                                ...prev,
                                checkDate: e.target.value,
                              }))
                            }
                            className="w-full px-8 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                          />
                        </div>
                      </div>
                    )}
                    {selectedPaymentMethod === "UPI" && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                          Virtual Payment Address
                        </label>
                        <input
                          type="text"
                          placeholder="identifier@protocol"
                          value={paymentFormDetails.upiId}
                          onChange={(e) =>
                            setPaymentFormDetails((prev: typeof paymentFormDetails) => ({
                              ...prev,
                              upiId: e.target.value,
                            }))
                          }
                          className="w-full px-8 py-4 bg-white border border-slate-100 rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-200 transition-all outline-none"
                        />
                      </div>
                    )}
                    {selectedPaymentMethod === "Cash" && (
                      <div className="flex items-start gap-4 p-4 bg-white/60 rounded-2xl border border-white/40">
                        <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">
                          A logistical coordinator will reach out to schedule an
                          offline asset transfer at your preferred node.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                <button
                  onClick={closePaymentFormModal}
                  className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (
                      selectedProjectForPayment.paymentStatus ===
                      "Official Receipt Issued"
                    ) {
                      submitBalancePayment(
                        selectedProjectForPayment.id,
                        selectedPaymentMethod as "Cash" | "Check" | "UPI",
                      );
                    } else {
                      submitPayment(
                        selectedProjectForPayment.id,
                        selectedPaymentMethod as "Cash" | "Check" | "UPI",
                      );
                    }
                  }}
                  disabled={
                    !selectedPaymentMethod ||
                    (selectedPaymentMethod === "Check" &&
                      (!paymentFormDetails.checkNumber ||
                        !paymentFormDetails.bankName ||
                        !paymentFormDetails.checkDate)) ||
                    (selectedPaymentMethod === "UPI" &&
                      !paymentFormDetails.upiId)
                  }
                  className="flex-[2] py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                >
                  <Check className="w-5 h-5" />
                  <span>Authorize Transaction</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {showReceiptModal && selectedReceipt && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={closeReceiptModal}
          receiptData={selectedReceipt.data}
          readOnly={true}
        />
      )}
    </>
  );
};

export default UserDashboard;
