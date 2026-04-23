import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { Button, Card, Spinner, Tabs } from "../../components/ui";
import { AnimatedWrapper, StaggeredList } from "../../components/shared/AnimatedComponents";
import { BookOpenIcon, UserGroupIcon, UploadIcon, DocumentDownloadIcon, ChevronLeftIcon, VideoCameraIcon, XCircleIcon } from "../../components/Icons";
import { api, BASE } from "../../services/api";
import { io } from "socket.io-client";
import { useToast } from "../../components/ui";
import { Roles } from "../../types";

const ClassroomDetailPage = () => {
    const { id } = useParams();
    const { currentUser } = useAppContext();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState<any>(null);
    const [resources, setResources] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Materials");
    const [uploading, setUploading] = useState(false);
    const [isMeetingLive, setIsMeetingLive] = useState(false);
    const [showJitsi, setShowJitsi] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchClassroomDetails();
    }, [id]);

    const fetchClassroomDetails = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [clsData, resData] = await Promise.all([
                api.getClassroom(id),
                api.getClassroomResources(id)
            ]);
            setClassroom(clsData);
            setIsMeetingLive(clsData.isMeetingLive);
            setResources(resData || []);
        } catch (err) {
            console.error(err);
            addToast("Failed to load classroom details", "error");
            navigate("/classrooms");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        const socket = io(BASE + "/classrooms", {
            transports: ["polling", "websocket"]
        });

        socket.on("meetingStarted", (data) => {
            if (data.classroomId === id) {
                setIsMeetingLive(true);
                addToast("A live meeting has started!", "success");
            }
        });

        socket.on("meetingEnded", (data) => {
            if (data.classroomId === id) {
                setIsMeetingLive(false);
                setShowJitsi(false);
                addToast("The meeting has ended", "info");
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [id]);

    const handleMeetingToggle = async () => {
        if (!id) return;
        try {
            if (isMeetingLive) {
                await api.endMeeting(id);
                setIsMeetingLive(false);
                setShowJitsi(false);
                addToast("Meeting ended", "info");
            } else {
                await api.startMeeting(id);
                setIsMeetingLive(true);
                setShowJitsi(true);
                addToast("Meeting started!", "success");
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to toggle meeting", "error");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);

        try {
            await api.uploadClassroomResource(id, formData);
            addToast("Material uploaded successfully!", "success");
            const updatedRes = await api.getClassroomResources(id);
            setResources(updatedRes || []);
        } catch (err) {
            console.error(err);
            addToast("Upload failed", "error");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
    if (!classroom) return null;

    return (
        <AnimatedWrapper className="space-y-6">
            <button
                onClick={() => navigate("/classrooms")}
                className="flex items-center text-sm font-black uppercase text-black hover:underline mb-8"
            >
                <ChevronLeftIcon className="w-5 h-5 mr-1" /> Back to Classrooms
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 border-b-4 border-black pb-8">
                <div>
                    <h2 className="text-4xl font-black uppercase text-black mb-2">{classroom.name}</h2>
                    <p className="text-lg font-bold text-black opacity-80">{classroom.description || "No description provided."}</p>
                </div>
                <div className="flex items-center gap-6 p-4 border-4 border-black bg-[var(--nb-yellow)] shadow-[var(--shadow-sm)]">
                    <div className="text-sm">
                        <p className="uppercase text-xs font-black text-black opacity-60">Teacher</p>
                        <p className="font-black text-black text-lg">{classroom.teacher?.name}</p>
                    </div>
                    <div className="h-10 w-1 bg-black"></div>
                    <div className="text-sm">
                        <p className="uppercase text-xs font-black text-black opacity-60">Class Code</p>
                        <p className="font-black tracking-widest text-black text-lg bg-white px-2 border-2 border-black inline-block">{classroom.classCode}</p>
                    </div>
                </div>
            </div>

            <Tabs
                tabs={currentUser?.role === Roles.TEACHER ? ["Materials", "Meet", "Students"] : ["Materials", "Meet"]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {activeTab === "Materials" && (
                <Card>
                    <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                        <h3 className="text-3xl font-black uppercase text-black">Study Materials</h3>
                        {currentUser?.role === Roles.TEACHER && (
                            <>
                                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="secondary">
                                    {uploading ? <Spinner /> : <><UploadIcon className="w-5 h-5 mr-2" /> Upload Material</>}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    accept=".pdf,.docx,.doc,.txt,.ppt,.pptx,.xlsx"
                                />
                            </>
                        )}
                    </div>

                    {resources.length > 0 ? (
                        <StaggeredList className="space-y-3">
                            {resources.map((res) => {
                                const fileUrl = `${BASE}${res.content}`;
                                return (
                                    <div key={res._id} className="p-4 border-4 border-black bg-white shadow-[var(--shadow-sm)] flex items-center justify-between group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 border-4 border-black bg-[var(--nb-pink)] group-hover:bg-[var(--nb-yellow)] transition-colors">
                                                <BookOpenIcon className="w-6 h-6 text-black" />
                                            </div>
                                            <div>
                                                <p className="font-black text-lg text-black uppercase">{res.title}</p>
                                                <p className="text-sm font-bold text-black opacity-60">UPLOADED {new Date(res.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-3 border-4 border-black bg-white hover:bg-[var(--nb-blue)] hover:text-white transition-colors text-black"
                                            >
                                                <DocumentDownloadIcon className="w-6 h-6" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </StaggeredList>
                    ) : (
                        <div className="text-center py-16 border-4 border-dashed border-black bg-[var(--nb-yellow)] opacity-80 mt-8">
                            <UploadIcon className="w-16 h-16 mx-auto mb-4 text-black" />
                            <p className="text-xl font-black uppercase text-black">No materials uploaded yet.</p>
                        </div>
                    )}
                </Card>
            )}

            {activeTab === "Meet" && (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-4 border-black bg-white shadow-[var(--shadow-md)] mt-8">
                    <div className={`p-8 border-4 border-black mb-8 ${isMeetingLive ? 'bg-red-300 animate-pulse' : 'bg-[var(--nb-yellow)]'}`}>
                        <VideoCameraIcon className={`w-20 h-20 text-black`}
                        />
                    </div>

                    <h3 className="text-4xl font-black uppercase text-black mb-4">
                        {isMeetingLive ? "Live Meeting in Progress" : "Classroom Video Meet"}
                    </h3>

                    <p className="max-w-xl mb-10 text-xl font-bold text-black opacity-80">
                        {isMeetingLive
                            ? "A live session is currently active. Join now to participate in the classroom discussion."
                            : "Start a video meeting to connect with your students in real-time. Students can join once the meeting is started."}
                    </p>

                    <div className="flex gap-4">
                        {isMeetingLive && currentUser?.role === Roles.STUDENT && (
                            <Button onClick={() => setShowJitsi(true)} variant="primary">
                                <VideoCameraIcon className="w-5 h-5 mr-2" /> Join Living Meeting
                            </Button>
                        )}

                        {currentUser?.role === Roles.TEACHER && (
                            <Button
                                onClick={handleMeetingToggle}
                                variant={isMeetingLive ? "danger" : "primary"}
                            >
                                <VideoCameraIcon className="w-5 h-5 mr-2" />
                                {isMeetingLive ? "End Meeting" : "Start Meeting"}
                            </Button>
                        )}

                        {isMeetingLive && currentUser?.role === Roles.TEACHER && (
                            <Button onClick={() => setShowJitsi(true)} variant="secondary">
                                Open Meeting UI
                            </Button>
                        )}
                    </div>

                        {!isMeetingLive && currentUser?.role === Roles.STUDENT && (
                        <p className="mt-8 text-lg font-bold text-black bg-[var(--nb-pink)] border-4 border-black px-6 py-4">
                            No active meeting. You'll be notified when the teacher starts one.
                        </p>
                    )}
                </div>
            )}

            {activeTab === "Students" && (
                <div className="mt-8">
                    <h3 className="text-3xl font-black uppercase mb-8 flex items-center gap-4 border-b-4 border-black pb-4 text-black">
                        <UserGroupIcon className="w-8 h-8 text-[var(--nb-pink)]" />
                        Enrolled Students ({classroom.students?.length || 0})
                    </h3>
                    <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {classroom.students?.map((student: any) => (
                            <div key={student._id || student.id} className="p-4 border-4 border-black bg-white shadow-[var(--shadow-sm)] flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center font-black text-xl border-4 border-black bg-[var(--nb-yellow)] text-black">
                                    {student.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-black text-lg text-black uppercase">{student.name}</p>
                                    <p className="text-sm font-bold text-black opacity-60 uppercase">{student.role}</p>
                                </div>
                            </div>
                        ))}
                        {(!classroom.students || classroom.students.length === 0) && (
                            <p className="col-span-full text-center py-12 text-xl font-black uppercase text-black opacity-60">No students joined yet.</p>
                        )}
                    </StaggeredList>
                </div>
            )}
            {showJitsi && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
                    <div className="w-full h-full max-w-7xl bg-white border-8 border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden">
                        <div className="p-4 border-b-8 border-black flex justify-between items-center bg-[var(--nb-yellow)]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 border-4 border-black bg-white">
                                    <VideoCameraIcon className="w-6 h-6 text-black" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase text-black leading-tight">Live: {classroom.name}</h3>
                                    <p className="text-sm font-bold text-black opacity-80 uppercase">Room: {classroom.classCode}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowJitsi(false)}
                                className="p-2 border-4 border-black bg-white hover:bg-[var(--nb-pink)] transition-colors hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                            >
                                <XCircleIcon className="w-8 h-8 text-black" />
                            </button>
                        </div>
                        <div className="flex-1 bg-black">
                            <iframe
                                src={`https://meet.jit.si/${classroom.classCode}#config.prejoinPageEnabled=false&userInfo.displayName="${currentUser?.name || 'User'}"&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","embedmeeting","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
                                allow="camera; microphone; display-capture; autoplay; clipboard-write"
                                className="w-full h-full border-none"
                                title="Jitsi Meeting"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </AnimatedWrapper>
    );
};

export default ClassroomDetailPage;
