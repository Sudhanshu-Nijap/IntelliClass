import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
// Removed Gemini service import
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { Card } from "../../components/ui";
import { BASE } from "../../services/api";
import { YoutubeIcon } from "../../components/Icons";
import YoutubeSearch from "../../components/YoutubeSearch";

const ResourcesPage = () => {
  const { resources } = useAppContext();
  const [isYoutubeSidebarOpen, setIsYoutubeSidebarOpen] = useState(false);

  return (
    <>
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
          <h2 className="text-4xl font-black uppercase text-black">Learning Resources</h2>
          <button
            onClick={() => setIsYoutubeSidebarOpen(!isYoutubeSidebarOpen)}
            className="p-3 border-4 border-black bg-white hover:bg-[var(--nb-pink)] transition-all shadow-[4px_4px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none focus:outline-none focus:ring-none"
            title="YouTube Search"
          >
            <YoutubeIcon className="w-8 h-8 text-red-600 focus:outline-none" />
          </button>
        </div>
        {/* AI Notes Generator Removed */}

        <Card className="border-4 border-black p-8 bg-white shadow-[var(--shadow-sm)]">
          <h3 className="text-3xl font-black uppercase text-black mb-6 border-b-4 border-black pb-4">Uploaded Content</h3>
          <ul className="space-y-4">
            {resources.map((res: any) => {
              const isFile =
                res.type === "file" &&
                typeof res.content === "string" &&
                res.content.startsWith("/uploads/");
              const fileUrl = isFile ? `${BASE}${res.content}` : undefined;
              return (
                <li
                  key={res._id || res.id}
                  className="p-6 border-4 border-black bg-[var(--nb-pink)] shadow-[4px_4px_0_0_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <div className="w-full md:w-auto">
                    <p className="font-black text-xl text-black uppercase mb-2">{res.title}</p>
                    {!isFile && (
                      <p className="text-sm font-bold text-black opacity-80 uppercase bg-white px-2 border-2 border-black inline-block truncate max-w-full md:max-w-xs">
                        {String(res.content)}
                      </p>
                    )}
                    {isFile && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-black font-black uppercase underline hover:bg-white hover:px-2 transition-all mt-2 inline-block"
                      >
                        View
                      </a>
                    )}
                  </div>
                  {isFile && (
                    <a
                      href={fileUrl}
                      download
                      className="px-6 py-3 border-4 border-black bg-white text-black font-black uppercase text-lg shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none whitespace-nowrap"
                    >
                      Download
                    </a>
                  )}
                </li>
              );
            })}
            {resources.length === 0 && (
              <p className="text-xl font-black uppercase text-black opacity-60 text-center py-8">No resources yet.</p>
            )}
          </ul>
        </Card>

      </AnimatedWrapper>

      <YoutubeSearch
        isOpen={isYoutubeSidebarOpen}
        onClose={() => setIsYoutubeSidebarOpen(false)}
      />
    </>
  );
};

export default ResourcesPage;
