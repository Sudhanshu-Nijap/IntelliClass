import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { Button, Card, Spinner, Modal } from "../../components/ui";
import { AnimatedWrapper, StaggeredList } from "../../components/shared/AnimatedComponents";
import { PlusCircleIcon, UserGroupIcon, BookOpenIcon, ChevronDownIcon, CheckCircleIcon, SearchIcon } from "../../components/Icons";
import { api } from "../../services/api";
import { useToast } from "../../components/ui";
import { Roles } from "../../types";

const ClassroomsPage = () => {
    const { currentUser, users } = useAppContext();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [classCode, setClassCode] = useState("");
    const [newClassName, setNewClassName] = useState("");
    const [newClassDesc, setNewClassDesc] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const fetchClassrooms = async () => {
        setIsLoading(true);
        try {
            const data = await api.getClassrooms();
            setClassrooms(data || []);
        } catch (err) {
            console.error(err);
            addToast("Failed to load classrooms", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinClass = async () => {
        if (!classCode.trim()) return;
        setIsSubmitting(true);
        try {
            await api.joinClassroom(classCode.toUpperCase());
            addToast("Joined classroom successfully!", "success");
            setIsJoinModalOpen(false);
            setClassCode("");
            fetchClassrooms();
        } catch (err) {
            console.error(err);
            addToast("Invalid class code or failed to join", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        setIsSubmitting(true);
        try {
            await api.createClassroom({
                name: newClassName,
                description: newClassDesc,
                studentIds: selectedStudents
            });
            addToast("Classroom created successfully!", "success");
            setIsCreateModalOpen(false);
            setNewClassName("");
            setNewClassDesc("");
            setSelectedStudents([]);
            fetchClassrooms();
        } catch (err) {
            console.error(err);
            addToast("Failed to create classroom", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatedWrapper className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b-4 border-black pb-4 mb-8">
                <h2 className="text-4xl font-black uppercase text-black mb-4 sm:mb-0">Classrooms</h2>
                <div className="flex gap-2">
                    {currentUser?.role === Roles.TEACHER ? (
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <PlusCircleIcon className="w-5 h-5" /> Create Class
                        </Button>
                    ) : (
                        <Button onClick={() => setIsJoinModalOpen(true)}>
                            <UserGroupIcon className="w-5 h-5" /> Join Class
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Spinner />
                </div>
            ) : (
                <Card>
                    {classrooms.length > 0 ? (
                        <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classrooms.map((cls) => (
                                <div
                                    key={cls._id}
                                    onClick={() => navigate(`/classrooms/${cls._id}`)}
                                    className="p-6 border-4 border-black bg-white shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between mb-4 border-b-4 border-black pb-4">
                                        <div className="w-12 h-12 flex items-center justify-center border-4 border-black bg-[var(--nb-yellow)] group-hover:bg-[var(--nb-pink)] transition-colors">
                                            <BookOpenIcon className="w-6 h-6 text-black" />
                                        </div>
                                        {currentUser?.role === Roles.TEACHER && (
                                            <span className="text-base font-black px-3 py-1 bg-white border-4 border-black uppercase text-black">
                                                {cls.classCode}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black uppercase text-black mb-2">{cls.name}</h3>
                                    <p className="text-base font-bold text-black opacity-80 line-clamp-2 mb-6 h-12">
                                        {cls.description || "No description provided."}
                                    </p>
                                    <div className="flex items-center text-sm font-black uppercase text-black bg-[var(--nb-blue)] text-white p-2 border-2 border-black inline-flex">
                                        <UserGroupIcon className="w-5 h-5 mr-2" />
                                        {cls.teacher?.name || "Teacher"}
                                    </div>
                                </div>
                            ))}
                        </StaggeredList>
                    ) : (
                        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No classrooms found. {currentUser?.role === Roles.STUDENT ? "Join one to get started!" : "Create your first one!"}</p>
                        </div>
                    )}
                </Card>
            )}

            {/* Join Modal */}
            <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join Classroom">
                <div className="space-y-4">
                    <p className="text-base font-bold text-black mb-2">Enter the 6-character code provided by your teacher.</p>
                    <input
                        type="text"
                        maxLength={6}
                        value={classCode}
                        onChange={(e) => setClassCode(e.target.value)}
                        placeholder="e.g. AB12XY"
                        className="w-full p-4 text-center text-3xl font-black uppercase border-4 border-black focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
                    />
                    <Button onClick={handleJoinClass} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner /> : "Join Class"}
                    </Button>
                </div>
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedStudents([]);
                }}
                title="Create Classroom"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-black uppercase mb-2 text-black">Class Name</label>
                        <input
                            type="text"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="e.g. Web Development 101"
                            className="w-full p-3 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-black uppercase mb-2 text-black">Description (Optional)</label>
                        <textarea
                            value={newClassDesc}
                            onChange={(e) => setNewClassDesc(e.target.value)}
                            placeholder="A brief description of the class..."
                            className="w-full p-3 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white h-24"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-black uppercase mb-2 flex justify-between text-black">
                            <span>Add Students</span>
                            <span className="text-xs bg-[var(--nb-pink)] text-black px-2 py-0.5 border-2 border-black">{selectedStudents.length} selected</span>
                        </label>

                        <div
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full p-3 border-4 border-black bg-white cursor-pointer flex justify-between items-center transition-all focus:outline-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[var(--shadow-sm)]"
                        >
                            <span className="text-base font-bold text-black opacity-80">
                                {selectedStudents.length === 0
                                    ? "Select students for this class..."
                                    : `${selectedStudents.length} students selected`
                                }
                            </span>
                            <ChevronDownIcon className={`w-6 h-6 text-black transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 border-4 border-black bg-white shadow-[var(--shadow-sm)] z-[60] overflow-hidden">
                                <div className="p-3 border-b-4 border-black bg-[var(--nb-yellow)]">
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search students..."
                                            className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold focus:outline-none bg-white text-black"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                    {!searchTerm && (
                                        <div
                                            onClick={() => {
                                                const students = users.filter(u => u.role === Roles.STUDENT);
                                                if (selectedStudents.length === students.length) setSelectedStudents([]);
                                                else setSelectedStudents(students.map(s => s._id || s.id));
                                            }}
                                            className="flex items-center p-3 cursor-pointer hover:bg-[var(--surface-2)] border-b-4 border-black transition-colors"
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center border-2 border-black"
                                                style={{ background: selectedStudents.length === users.filter(u => u.role === Roles.STUDENT).length && users.filter(u => u.role === Roles.STUDENT).length > 0 ? 'var(--nb-blue)' : 'white' }}>
                                                {selectedStudents.length === users.filter(u => u.role === Roles.STUDENT).length && users.filter(u => u.role === Roles.STUDENT).length > 0 && <CheckCircleIcon className="w-5 h-5 text-white" />}
                                            </div>
                                            <span className="ml-3 text-base font-black uppercase text-black">Select All Students</span>
                                        </div>
                                    )}

                                    {users.filter(u => u.role === Roles.STUDENT && u.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                        users.filter(u => u.role === Roles.STUDENT && u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
                                            const isSelected = selectedStudents.includes(student._id || student.id);
                                            return (
                                                <div
                                                    key={student._id || student.id}
                                                    onClick={() => {
                                                        const id = student._id || student.id;
                                                        if (isSelected) setSelectedStudents(prev => prev.filter(sid => sid !== id));
                                                        else setSelectedStudents(prev => [...prev, id]);
                                                    }}
                                                    className={`flex items-center p-3 cursor-pointer border-b-2 border-transparent hover:border-black transition-all ${isSelected ? 'bg-[var(--nb-yellow)]' : 'bg-white'}`}
                                                >
                                                    <div className="w-6 h-6 flex items-center justify-center border-2 border-black bg-white">
                                                        {isSelected && <CheckCircleIcon className="w-5 h-5 text-black" />}
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-base font-bold text-black uppercase">
                                                            {student.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="p-4 text-center text-xs italic" style={{ color: 'var(--text-subtle)' }}>No matching students found.</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {isDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsDropdownOpen(false)} />}
                    </div>

                    <Button onClick={handleCreateClass} className="w-full mt-4 py-3 text-lg" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner /> : "Create Class"}
                    </Button>
                </div>
            </Modal>
        </AnimatedWrapper>
    );
};

export default ClassroomsPage;
