'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Fingerprint,
    Clock,
    User,
    Mail,
    Hash,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    LogOut,
    Microscope,
    Dna,
    FlaskConical,
    Building2,
    ChevronRight,
    Send,
    Camera,
    Upload,
    RefreshCcw,
    Trash2,
    Briefcase,
    Award,
    MapPin,
    Smartphone,
    Activity,
    Loader2,
    Globe
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { validateURL } from '@/lib/validation';
import Header from '../../Compontent/Header';
import Footer from '../../Compontent/Footer';
import { acquireCamera, releaseCamera, subscribeToCameraStatus, CameraStatus, requestCameraTakeover } from '@/lib/camera';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const AttendanceLoginPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get('redirect') || '/';

    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState(2); // Start at Verification Details phase
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        uniqueId: '',
        password: ''
    });
    const [userData, setUserData] = useState<any>(null);
    const [verificationData, setVerificationData] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>('IDLE');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [attendanceSuccess, setAttendanceSuccess] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [faceStatus, setFaceStatus] = useState<'searching' | 'detected' | 'locked' | 'error'>('searching');
    const [scanProgress, setScanProgress] = useState(0);
    const [modelLoadError, setModelLoadError] = useState<string | null>(null);
    const scanProgressRef = useRef(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isAutoCapturing = useRef(false);
    const [captureAttempts, setCaptureAttempts] = useState(0);
    const searchStartTime = useRef<number>(Date.now());
    const isLoadingModelsRef = useRef(false);
    const isOpeningCameraRef = useRef(false);
    const activeStreamRef = useRef<MediaStream | null>(null);

    // Load face-api models
    const loadModels = async () => {
        if (isModelsLoaded || isLoadingModelsRef.current) return;

        // @ts-ignore
        const faceapi = window.faceapi;
        if (!faceapi) {
            console.warn('⚠️ faceapi not found on window yet');
            return;
        }

        isLoadingModelsRef.current = true;
        setModelLoadError(null);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('MODEL_LOAD_TIMEOUT')), 30000)
        );

        try {
            // Use a more stable model source from CDN
            const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
            const FALLBACK_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            console.log('⏳ Loading AI models from:', MODEL_URL);

            await Promise.race([
                (async () => {
                    try {
                        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                    } catch (primaryErr) {
                        console.warn('⚠️ Primary model URL failed, trying fallback...', primaryErr);
                        await faceapi.nets.tinyFaceDetector.loadFromUri(FALLBACK_MODEL_URL);
                        await faceapi.nets.faceLandmark68Net.loadFromUri(FALLBACK_MODEL_URL);
                        await faceapi.nets.faceRecognitionNet.loadFromUri(FALLBACK_MODEL_URL);
                    }
                })(),
                timeoutPromise
            ]);

            setIsModelsLoaded(true);
            console.log('✅ All AI Engines Ready');
        } catch (err: any) {
            console.error('❌ Model Load Failed:', err);
            setIsModelsLoaded(false);
            isLoadingModelsRef.current = false;
            setModelLoadError(err.message === 'MODEL_LOAD_TIMEOUT' ? 'Network too slow to load AI models.' : 'AI Engine failed to initialize.');
        }
    };

    // Subscribe to shared camera status updates
    useEffect(() => {
        const unsubscribe = subscribeToCameraStatus((status: CameraStatus, msg?: string) => {
            setCameraStatus(status);
            if (status === 'BUSY_EXTERNAL' || status === 'OPENING') {
                setCameraError(msg || 'Initializing hardware...');
            } else if (status === 'ACTIVE') {
                setCameraError(null);
            }
        });
        return unsubscribe;
    }, []);

    const handleTakeover = () => {
        requestCameraTakeover();
        toast.loading('Requesting camera access...', { duration: 1500 });
        setTimeout(() => {
            // Force status reset is handled by requestCameraTakeover in library
            startCamera();
        }, 1500);
    };

    // Set mounted on client side
    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-fill and Auto-redirect if logged in
    useEffect(() => {
        if (!mounted) return;
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (savedUser && token) {
            try {
                const user = JSON.parse(savedUser);
                if (user.id && user.role) {
                    setUserData(user);
                }
            } catch (e) {
                console.error('Error parsing user from localStorage', e);
            }
        } else {
            // If No session, go back to signin
            router.push('/Login/Signin');
        }

        // Get Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn('Location access denied', err)
            );
        }

        // Get or Create Device ID
        let dId = localStorage.getItem('attendance_device_id');
        if (!dId) {
            dId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('attendance_device_id', dId);
        }
        setDeviceId(dId);

        if (isModelsLoaded) return;
        // Check for faceapi on window every 500ms
        const checkInterval = setInterval(() => {
            // @ts-ignore
            const faceapi = window.faceapi;
            if (faceapi && !isModelsLoaded && !isLoadingModelsRef.current) {
                console.log('📜 FaceAPI detected on window, starting model load...');
                loadModels();
            }
        }, 1000);

        return () => clearInterval(checkInterval);
    }, [isModelsLoaded]);

    // Real-time Face Scanning Loop
    useEffect(() => {
        if (!isCameraOpen || !isModelsLoaded || capturedImage) {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
            }
            scanProgressRef.current = 0;
            setScanProgress(0);
            isAutoCapturing.current = false;
            return;
        }

        searchStartTime.current = Date.now();

        const runScanner = async () => {
            // @ts-ignore
            const faceapi = window.faceapi;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || !faceapi) return;

            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            faceapi.matchDimensions(canvas, displaySize);

            let timeoutId: NodeJS.Timeout;

            const scan = async () => {
                if (!isCameraOpen || capturedImage || isAutoCapturing.current) return;

                const startTime = Date.now();
                // Use TinyFaceDetector for better speed/reliability
                const detection = await faceapi.detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.20 })
                ).withFaceLandmarks();

                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (detection) {
                    const resizedDetection = faceapi.resizeResults(detection, displaySize);

                    // Professional Overlay Drawing
                    ctx!.strokeStyle = '#6366f1'; // indigo-500
                    ctx!.lineWidth = 2;
                    const box = resizedDetection.detection.box;

                    // Draw Rounded Bounding Box Corners
                    const cornerSize = 15;
                    ctx!.beginPath(); ctx!.moveTo(box.x, box.y + cornerSize); ctx!.lineTo(box.x, box.y); ctx!.lineTo(box.x + cornerSize, box.y); ctx!.stroke();
                    ctx!.beginPath(); ctx!.moveTo(box.right - cornerSize, box.y); ctx!.lineTo(box.right, box.y); ctx!.lineTo(box.right, box.y + cornerSize); ctx!.stroke();
                    ctx!.beginPath(); ctx!.moveTo(box.x, box.bottom - cornerSize); ctx!.lineTo(box.x, box.bottom); ctx!.lineTo(box.x + cornerSize, box.bottom); ctx!.stroke();
                    ctx!.beginPath(); ctx!.moveTo(box.right - cornerSize, box.bottom); ctx!.lineTo(box.right, box.bottom); ctx!.lineTo(box.right, box.bottom - cornerSize); ctx!.stroke();

                    setFaceStatus('detected');
                    // Instant Lock
                    scanProgressRef.current = 100;
                    setScanProgress(100);

                    isAutoCapturing.current = true;
                    setFaceStatus('locked');
                    handleAutoCapture(detection);
                    return;
                } else {
                    setFaceStatus('searching');
                    scanProgressRef.current = 0;
                    setScanProgress(0);

                    // If searching for more than 5s, show warning
                    if (Date.now() - searchStartTime.current > 5000) {
                        setFaceStatus('error');
                    }
                }

                // Calculate delay to maintain ~80ms frequency but avoid overlap
                const duration = Date.now() - startTime;
                const nextDelay = Math.max(10, 80 - duration);
                if (isCameraOpen && !capturedImage && !isAutoCapturing.current) {
                    timeoutId = setTimeout(scan, nextDelay);
                }
            };

            scan(); // Start the first scan

            return () => {
                if (timeoutId) clearTimeout(timeoutId);
            };
        };

        runScanner();

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
            }
        };
    }, [isCameraOpen, isModelsLoaded, capturedImage]);

    const handleAutoCapture = async (initialDetection: any) => {
        console.log('📸 Capture initiated...');
        const video = videoRef.current;
        if (!video || video.readyState !== 4 || video.videoWidth === 0) {
            console.warn('⚠️ Video not ready or dimensions zero', video?.readyState, video?.videoWidth);
            toast.error('Camera not ready. Please wait a second.');
            resetScanner();
            return;
        }

        const livenessToast = toast.loading('Verifying identity...', { id: 'liveness' });

        try {
            // @ts-ignore
            const faceapi = window.faceapi;

            if (!faceapi) {
                console.warn('⚠️ AI Engine not ready for capture');
                toast.error('AI Engine not ready. Please wait a moment.', { id: 'liveness' });
                resetScanner();
                return;
            }

            // 1. Instant Snapshot (Fastest possible feed)
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = video.videoWidth;
            captureCanvas.height = video.videoHeight;
            const ctx = captureCanvas.getContext('2d');
            if (ctx) {
                ctx.translate(captureCanvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0);
            }
            const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.6); // Lower quality for speed

            setIsVerifying(true);
            console.log('⚙️ Detecting face in snapshot...');

            // 2. Identity Extraction (Lightweight pass) - Use TinyFace for speed and reliability
            const detectionPromise = faceapi.detectSingleFace(
                captureCanvas,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.15 })
            ).withFaceLandmarks().withFaceDescriptor();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('DETECTION_TIMEOUT')), 10000)
            );

            const fullDetection = await Promise.race([detectionPromise, timeoutPromise]) as any;
            console.log('✅ Detection result:', fullDetection ? 'Face Found' : 'No Face');

            if (!fullDetection) {
                throw new Error('FACE_LOST');
            }

            processCapture(fullDetection, dataUrl);

        } catch (err: any) {
            console.error('❌ Auto-capture error:', err);
            setCaptureAttempts(prev => prev + 1);

            let errorMsg = 'Capture failed. Try again.';
            if (err.message === 'FACE_LOST') errorMsg = 'No face detected. Please face the camera directly.';
            if (err.message === 'DETECTION_TIMEOUT') errorMsg = 'Detection took too long. Check your lighting.';

            toast.error(errorMsg, { id: 'liveness', duration: 4000 });
            resetScanner();
        } finally {
            setIsVerifying(false);
        }
    };

    const processCapture = (detection: any, dataUrl: string) => {
        const embedding = Array.from(detection.descriptor) as number[];
        setFaceDescriptor(embedding);
        setCapturedImage(dataUrl);
        stopCamera();
        toast.success('Identity Verified!', { id: 'liveness' });
    };

    const resetScanner = () => {
        setIsVerifying(false);
        isAutoCapturing.current = false;
        setFaceStatus('searching');
        setScanProgress(0);
        scanProgressRef.current = 0;
        searchStartTime.current = Date.now();
    };

    // Auto-open camera when step becomes 3
    useEffect(() => {
        if (!mounted) return;

        if (step === 3 && !capturedImage && !isCameraOpen) {
            startCamera();
        }

        return () => {
            stopCamera();
        };
    }, [step, capturedImage, mounted]);



    const handleMarkAttendance = async () => {
        setLoading(true);
        setError(null);

        if (!capturedImage) {
            setError('Please capture a verification photo');
            setLoading(false);
            return;
        }

        if (userData?.attendanceVerificationMethod === 'Virtual' && (!faceDescriptor || faceDescriptor.length === 0)) {
            setError('Face verification data is missing. Please capture your photo again correctly.');
            setLoading(false);
            return;
        }

        const endpoint = `${API_URL}/api/attendance/request-attendance`;

        const payload: any = {
            status: 'present',
            checkIn: new Date().toISOString(),
            environment: userData?.attendanceVerificationMethod?.toLowerCase() || 'virtual',
            notes: notes.trim() || undefined,
            virtualVerificationImage: capturedImage,
            faceEmbedding: faceDescriptor, // The vector
            location: location,
            deviceId: deviceId,
            timestamp: new Date().toISOString()
        };

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(endpoint, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                toast.success('Attendance verified & marked!');

                // Update user data if backend returns fresh info (with verification details)
                if (response.data.user) {
                    console.log('✅ Backend returned user data:', response.data.user);
                    setUserData(response.data.user);
                }

                setAttendanceSuccess(true);
                setStep(2); // Show the Details/Success screen

                // Determine dashboard path based on role, department, service, and seniority
                const determineDashboardPath = (user: any) => {
                    const role = (user.role || '').toLowerCase();
                    const department = (user.department || '').toLowerCase();
                    const service = (user.service || '').toLowerCase();
                    const seniority = (user.seniority || '').toLowerCase();

                    console.log('🔍 Routing Decision Inputs:', { role, department, service, seniority });

                    // Helper to normalize input to dashboard slug
                    const normalizeToSlug = (input: string): string => {
                        if (!input) return '';
                        return input
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9\s&]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/&/g, '-and-')
                            .replace(/-+/g, '-')
                            .replace(/^-|-$/g, '');
                    };

                    const userRole = role;
                    const userDeptSlug = normalizeToSlug(department);
                    const userServiceSlug = normalizeToSlug(service);
                    const userSenioritySlug = normalizeToSlug(seniority);

                    // Base paths for all roles
                    const basePaths: Record<string, string> = {
                        admin: '/admin-dashboard',
                        subadmin: '/subadmin-dashboard',
                        user: '/user-dashboard',
                        employee: '/employee-dashboard',
                        manager: '/manager-dashboard',
                        head: '/head-dashboard',
                        tl: '/tl-dashboard',
                    };

                    // Roles that use department/service paths
                    const structuredRoles = ['subadmin', 'employee', 'manager', 'head', 'tl'];

                    if (structuredRoles.includes(userRole)) {
                        // Mappings for shortening slugs (departments and services)
                        const slugMappings: Record<string, string> = {
                            // Departments
                            'sales-and-customer-services': 'sale',
                            'human-resources': 'hr',
                            'financial': 'finance',
                            'finance-department': 'finance',
                            // Services
                            'ngs': 'ngs',
                            'drug-discovery': 'drug-discovery',
                            'software-development': 'software-development',
                            'microbiology': 'microbiology',
                            'biochemistry': 'biochemistry',
                            'molecular-biology': 'molecular-biology',
                        };

                        let path = '';
                        if (userDeptSlug) {
                            const mappedDept = slugMappings[userDeptSlug] || userDeptSlug;
                            path = `/department/${mappedDept}`;
                            if (userServiceSlug && userRole !== 'subadmin') {
                                const mappedService = slugMappings[userServiceSlug] || userServiceSlug;
                                path += `/service/${mappedService}`;
                            }
                        } else if (userServiceSlug) {
                            const mappedService = slugMappings[userServiceSlug] || userServiceSlug;
                            path = `/service/${mappedService}`;
                        }

                        // Append seniority for employee role
                        if (userRole === 'employee' && userSenioritySlug) {
                            path += `/seniority/${userSenioritySlug}`;
                        }

                        return `${basePaths[userRole]}${path}`;
                    }

                    // Fixed paths for admin and user
                    return basePaths[userRole] || '/';
                };

                let dashboardPath = determineDashboardPath(response.data.user || userData);
                console.log('🎯 Redirecting to:', dashboardPath);

                setTimeout(() => {
                    router.push(dashboardPath);
                }, 3000); // 3 seconds to read the success screen
            } else {
                setError(response.data.message || 'Failed to mark attendance');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to mark attendance. It might be already marked for today.');
            toast.error('Attendance marking failed');
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        if (isOpeningCameraRef.current) return;
        isOpeningCameraRef.current = true;
        setCameraError(null);

        try {
            console.log('🎥 Requesting shared camera for attendance (video-only)...');
            const stream = await acquireCamera('attendance', { video: true, audio: false });
            activeStreamRef.current = stream;

            if (videoRef.current) {
                console.log('[Attendance] 📺 Attaching stream to video element');
                videoRef.current.srcObject = stream;
                try { await videoRef.current.play(); } catch (_) { }
            }

            setCameraError(null);
            setIsCameraOpen(true);
            console.log('✅ Camera stream active (shared)');
        } catch (err: any) {
            console.error('❌ Attendance Camera Error:', err);
            const name: string = err?.name || '';
            let uiMsg = 'Could not access camera.';

            if (err.name === 'TabConflictError') {
                uiMsg = `${err.message} You can take your photo in that tab or close it to use it here.`;
            } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                uiMsg = 'Camera permission denied. Please allow access in browser settings.';
            } else if (name === 'NotReadableError' || name === 'AbortError') {
                uiMsg = 'Camera is locked by another app (e.g. Teams, Zoom, or another Meeting tab). Close them and click Retry.';
            } else {
                uiMsg = err?.message || uiMsg;
            }

            setCameraError(uiMsg);
            toast.error(uiMsg, { duration: 4000 });
        } finally {
            isOpeningCameraRef.current = false;
        }
    };

    // Auto-re-attach stream if the video element remounts (framer-motion can cause this)
    useEffect(() => {
        if (!isCameraOpen) return;
        const stream = activeStreamRef.current;
        if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
            console.log('[Attendance] 🔄 Re-attaching stream to video element');
            videoRef.current.srcObject = stream;
        }
    }, [isCameraOpen]);


    const stopCamera = () => {
        releaseCamera('attendance');
        activeStreamRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = async () => {
        // Manual capture fallback if auto-capture is slow
        if (faceStatus === 'detected' || faceStatus === 'searching') {
            toast.error('Please keep your face steady inside the scanner.');
        }
    };

    const clearCapturedImage = () => {
        setCapturedImage(null);
        setFaceDescriptor(null);
        setFaceStatus('searching');
        setScanProgress(0);
        scanProgressRef.current = 0;
        isAutoCapturing.current = false;
        // Automatically restart camera after discarding the image
        startCamera();
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-blue-100 font-sans">
            <Script
                src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js"
                strategy="afterInteractive"
                crossOrigin="anonymous"
                onLoad={() => {
                    // @ts-ignore
                    console.log('📜 FaceAPI script loaded successfully - Version:', window.faceapi?.version || 'unknown');
                    // Manual trigger to speed up if script loaded late
                    // @ts-ignore
                    if (window.faceapi && !isModelsLoaded && !isLoadingModelsRef.current) {
                        loadModels();
                    }
                }}
                onError={(e) => {
                    console.error('❌ FaceAPI Script Load Error:', e);
                    setModelLoadError('AI script failed to load from CDNs. Please check your internet or firewall settings.');
                }}
            />
            <Header />

            <main className="flex-grow flex items-center justify-center py-12 px-4 relative overflow-hidden">
                {/* Background decorations */}
                {/* <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
                    <Dna size={400} className="text-indigo-600 rotate-12" />
                </div>
                <div className="absolute bottom-0 left-0 p-20 opacity-10 pointer-events-none">
                    <FlaskConical size={300} className="text-blue-600 -rotate-12" />
                </div> */}

                <div className="max-w-xl w-full">
                    <AnimatePresence mode="wait">


                        {/* STEP 2: DETAILS DISPLAY */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="bg-white border border-indigo-100 shadow-2xl rounded-[3rem] p-10 text-center"
                            >
                                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-green-200/50">
                                    <CheckCircle2 size={56} />
                                </div>

                                <h2 className="text-3xl font-black text-gray-900 mb-2">
                                    {attendanceSuccess ? 'Attendance Marked!' : 'Verified Successfully'}
                                </h2>
                                <p className="text-gray-500 font-medium mb-10">
                                    {attendanceSuccess ? 'Redirecting to your dashboard...' : 'Welcome back to the portal'}
                                </p>

                                <div className="bg-gray-50 rounded-[2rem] p-8 space-y-6 text-left border border-gray-100 mb-10">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Full Name</p>
                                                <p className="font-bold text-gray-800 line-clamp-1">{userData?.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                                                <Briefcase size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Role</p>
                                                <p className="font-bold text-gray-800 capitalize">{userData?.role}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                                                <Hash size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Unique ID</p>
                                                <p className="font-bold text-gray-800">{userData?.uniqueId}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Department</p>
                                                <p className="font-bold text-gray-800">{userData?.department || 'Research'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {(userData?.service || userData?.seniority) && (
                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                            {userData?.service && (
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                                                        <FlaskConical size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Service</p>
                                                        <p className="font-bold text-gray-800">{userData?.service}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {userData?.seniority && (
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                                                        <Award size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Seniority</p>
                                                        <p className="font-bold text-gray-800 capitalize">{userData?.seniority}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-gray-200">
                                        <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                            <div className="flex items-center gap-3">
                                                {userData?.attendanceVerificationMethod === 'Virtual' ? (
                                                    <div className="p-2 bg-blue-500 rounded-lg text-white">
                                                        <Clock size={18} />
                                                    </div>
                                                ) : (
                                                    <div className="p-2 bg-emerald-500 rounded-lg text-white">
                                                        <Fingerprint size={18} />
                                                    </div>
                                                )}
                                                <span className="font-bold text-gray-700">Method: {userData?.attendanceVerificationMethod}</span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-indigo-500 bg-white px-2 py-1 rounded-md border border-indigo-100 shadow-sm">Policy Applied</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep(3)}
                                    className="group w-full bg-gray-900 text-white font-bold py-5 rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 text-lg"
                                >
                                    Confirm and Continue
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 3: ATTENDANCE FORM */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white border border-gray-100 shadow-2xl rounded-[3rem] overflow-hidden"
                            >
                                <div className="p-10 text-center bg-blue-600 text-white">
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                        <Camera size={32} />
                                    </div>
                                    <h2 className="text-2xl font-black">Photo Verification</h2>
                                    <p className="text-white/70 font-medium">Please verify with a photo to check-in</p>
                                </div>

                                <div className="p-10 space-y-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                                                    Identity Verification
                                                </label>
                                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Biometric Sensor Required</h3>
                                            </div>
                                            <div className="px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100/50">
                                                <div className="flex items-center gap-2">
                                                    <Camera size={14} className="text-indigo-600" />
                                                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Active Relay</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            {capturedImage ? (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.98 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="relative aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl ring-1 ring-gray-100"
                                                >
                                                    <img src={validateURL(capturedImage)} alt="Verification" className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1]" />
                                                    <div className="absolute inset-0 bg-indigo-600/10 mix-blend-overlay" />

                                                    <div className="absolute top-6 left-6 px-4 py-2 glass-dark rounded-xl flex items-center gap-3">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Data Secured</span>
                                                    </div>

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCapturedImage(null);
                                                                startCamera();
                                                            }}
                                                            className="px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-2xl text-white font-bold text-sm hover:bg-white/30 transition-all flex items-center gap-2"
                                                        >
                                                            <RefreshCcw size={18} />
                                                            Retake
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={clearCapturedImage}
                                                            className="px-6 py-3 bg-red-500 rounded-2xl text-white font-bold text-sm hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/30"
                                                        >
                                                            <Trash2 size={18} />
                                                            Discard
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ) : isCameraOpen ? (
                                                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-slate-900 border-4 border-white shadow-2xl ring-1 ring-gray-200">
                                                    <video
                                                        id="attendance-camera"
                                                        autoPlay
                                                        playsInline
                                                        muted
                                                        ref={(video) => {
                                                            videoRef.current = video;
                                                            // Safety net: assign stream in ref callback too
                                                            if (video && activeStreamRef.current && !video.srcObject) {
                                                                video.srcObject = activeStreamRef.current;
                                                            }
                                                        }}
                                                        className="w-full h-full object-cover"
                                                        style={{ transform: 'scaleX(-1)' }}
                                                    />
                                                    <canvas
                                                        ref={canvasRef}
                                                        className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-60"
                                                    />

                                                    {/* Scanning HUD Overlay */}
                                                    <div className="absolute inset-0 z-20 pointer-events-none">
                                                        {/* Scanning Bar */}
                                                        <div className="absolute inset-x-0 h-1/4 bg-gradient-to-b from-indigo-500/20 to-transparent animate-scanning" />

                                                        {/* HUD Badges */}
                                                        <div className="p-8 h-full flex flex-col justify-between">
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-2">
                                                                    <div className="px-4 py-2 glass-dark rounded-xl border border-white/10 text-indigo-400 font-mono text-[10px] flex items-center gap-3">
                                                                        <div className="flex gap-1">
                                                                            <div className="w-1 h-3 bg-indigo-500 rounded-full" />
                                                                            <div className="w-1 h-3 bg-indigo-500/40 rounded-full" />
                                                                        </div>
                                                                        CORE_V3.0_LIVE
                                                                    </div>
                                                                    {mounted && (
                                                                        <div className="px-3 py-1 glass-dark/40 rounded-lg text-[8px] text-slate-400 font-mono">
                                                                            LOC: {location?.lat?.toFixed(2) || '0.0'}, {location?.lng?.toFixed(2) || '0.0'}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className={`px-4 py-2 glass-dark rounded-xl border transition-all duration-500 ${faceStatus === 'detected' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/10'}`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-2 h-2 rounded-full ${faceStatus === 'detected' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                                                            {faceStatus === 'detected' ? 'Target Locked' : 'Searching...'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-6">
                                                                {faceStatus === 'detected' && (
                                                                    <div className="w-full max-w-[240px] space-y-2 translate-y-[-20px]">
                                                                        <div className="flex justify-between items-end px-1">
                                                                            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Pattern Match</span>
                                                                            <span className="text-[10px] font-mono text-white">{scanProgress}%</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                                            <motion.div
                                                                                initial={{ width: 0 }}
                                                                                animate={{ width: `${scanProgress}%` }}
                                                                                className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="px-6 py-3 glass-dark rounded-2xl border border-white/10 flex items-center gap-3">
                                                                    <Activity size={14} className={`transition-colors ${faceStatus === 'detected' ? 'text-emerald-400' : 'text-indigo-400 animate-pulse'}`} />
                                                                    <span className="text-xs font-bold text-white/90">
                                                                        {faceStatus === 'detected' ? 'Biometrics Analysis Active' : faceStatus === 'error' ? 'Low Light - Adjust Position' : 'Position Face in Viewport'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons Integrated into Camera View */}
                                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={stopCamera}
                                                            className="px-6 py-3 glass-dark text-white rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-xs font-bold active:scale-95"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (modelLoadError) {
                                                                    isLoadingModelsRef.current = false;
                                                                    loadModels();
                                                                    return;
                                                                }

                                                                const video = videoRef.current;
                                                                if (!video || !isModelsLoaded) {
                                                                    toast.error('AI Engines taking longer than expected. Retrying...', { id: 'init-warn' });
                                                                    return;
                                                                }

                                                                if (!isAutoCapturing.current) {
                                                                    isAutoCapturing.current = true;
                                                                    await handleAutoCapture(null);
                                                                }
                                                            }}
                                                            disabled={isVerifying}
                                                            className={`px-10 py-4 rounded-2xl shadow-2xl transition-all text-sm font-black active:scale-95 disabled:opacity-50 flex items-center gap-3 ${modelLoadError
                                                                ? 'bg-red-600 text-white shadow-red-500/40'
                                                                : 'bg-indigo-600 text-white shadow-indigo-600/40 hover:bg-indigo-500'
                                                                }`}
                                                        >
                                                            {isVerifying ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                    Analyzing...
                                                                </>
                                                            ) : !isModelsLoaded ? (
                                                                modelLoadError ? 'Retry Core' : 'Loading AI...'
                                                            ) : (
                                                                <>
                                                                    <Fingerprint size={18} />
                                                                    Verify Now
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {modelLoadError && (
                                                        <div className="absolute inset-0 z-40 glass-dark/95 flex items-center justify-center p-8">
                                                            <div className="max-w-xs text-center">
                                                                <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                                    <AlertCircle size={32} />
                                                                </div>
                                                                <h4 className="font-black text-white mb-2 uppercase tracking-widest text-sm">Protocol Failure</h4>
                                                                <p className="text-slate-400 text-xs mb-8 leading-relaxed px-4">{modelLoadError}</p>
                                                                <button
                                                                    onClick={() => {
                                                                        isLoadingModelsRef.current = false;
                                                                        loadModels();
                                                                    }}
                                                                    className="w-full bg-white text-slate-900 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-colors"
                                                                >
                                                                    Restart Core Engines
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : cameraStatus === 'BUSY_EXTERNAL' || (cameraError && cameraStatus === 'OPENING') ? (
                                                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-slate-950 border-4 border-indigo-500/20 shadow-2xl flex items-center justify-center">
                                                    <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
                                                    <div className="text-center px-8 max-w-sm relative z-10">
                                                        <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5 animate-bounce">
                                                            <Camera size={36} className="text-indigo-400" />
                                                        </div>
                                                        <h4 className="text-white font-black text-base mb-2 uppercase tracking-widest tracking-[0.2em]">Hardware Standby</h4>
                                                        <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                                                            Camera is currently held by another application (Zoom, Teams, etc).
                                                            <br /><span className="text-indigo-400">System will automatically resume when freed.</span>
                                                        </p>
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Loader2 size={16} className="text-indigo-400 animate-spin" />
                                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Awaiting Control...</span>
                                                        </div>
                                                        <button
                                                            onClick={handleTakeover}
                                                            className="mt-6 w-full py-3 bg-white text-indigo-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-lg"
                                                        >
                                                            <RefreshCcw size={12} />
                                                            Force Takeover
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : cameraError ? (
                                                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-slate-950 border-4 border-red-500/30 shadow-2xl flex items-center justify-center">
                                                    <div className="text-center px-8 max-w-sm">
                                                        <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
                                                            <Camera size={36} className="text-red-400" />
                                                        </div>
                                                        <h4 className="text-white font-black text-base mb-2 uppercase tracking-widest">Access Protocol Warning</h4>
                                                        <p className="text-slate-400 text-xs leading-relaxed mb-6">{cameraError}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => startCamera()}
                                                            className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 font-black py-3.5 rounded-2xl text-sm uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-xl"
                                                        >
                                                            <RefreshCcw size={16} />
                                                            Restart Optical Interface
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => startCamera()}
                                                        className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-indigo-200 rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-50 transition-all group bg-indigo-50/20 relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                                            <ShieldCheck size={180} />
                                                        </div>
                                                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 group-hover:scale-110 transition-all duration-500 relative z-10">
                                                            <Camera className="text-white" size={40} />
                                                        </div>
                                                        <span className="text-2xl font-black text-gray-900 tracking-tight relative z-10">Initialize Biometric Scanners</span>
                                                        <p className="text-sm text-gray-500 mt-2 font-medium relative z-10">Encrypted real-time liveness verification only</p>

                                                        <div className="mt-8 flex gap-4 relative z-10">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-white px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">
                                                                <ShieldCheck size={14} /> SECURE_ID
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-white px-4 py-2 rounded-xl border border-blue-100 shadow-sm">
                                                                <Globe size={14} /> RELAY_LIVE
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-4 p-5 bg-white rounded-[1.8rem] border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                                    <MapPin size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Geolocation</span>
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Syncing..."}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-5 bg-white rounded-[1.8rem] border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <Smartphone size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Device ID</span>
                                                    <span className="text-xs font-bold text-gray-700 truncate w-24">
                                                        {deviceId || "Unbound"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight bg-blue-50 p-3 rounded-xl border border-blue-100">
                                        * Security Policy: Automated liveness check will verify blinks and head movements. No gallery uploads permitted.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-gray-900 uppercase tracking-widest ml-1">
                                        Check-in Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Special notes or remarks for your check-in..."
                                        rows={3}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-medium">
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="px-8 py-5 rounded-2xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all flex items-center justify-center"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => handleMarkAttendance()}
                                        disabled={loading}
                                        className={`flex-1 font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 ${userData?.attendanceVerificationMethod === 'Virtual'
                                            ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                                            : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                                            }`}
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                {userData?.attendanceVerificationMethod === 'Virtual' ? 'Start Virtual Session' : 'Mark Attendance'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Bottom actions */}
                    <div className="mt-8 text-center flex items-center justify-center gap-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('user');
                                router.push('/Login/Signin');
                            }}
                            className="flex items-center gap-2 text-gray-500 hover:text-red-600 font-bold text-sm transition-colors"
                        >
                            <LogOut size={16} />
                            Sign Out and Restart
                        </button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

const AttendanceLoginPage = () => {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <AttendanceLoginPageContent />
        </Suspense>
    );
};

export default AttendanceLoginPage;
