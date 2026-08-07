import {PanelLeftIcon, PenSquare, Plus} from "lucide-react";

function SideBar() {
  return (
    <div className='fixed lg:static inset-y-0 left-0 z-50 w-[270px] h-screen shrink-0 bg-[#0d0f14] border-r border-white/[0.06]'>
      <div className='flex flex-col h-full'>
        <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]'>
            <div className='hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors duration-150 bg-transparent border-none cursor-pointer'>
              <PanelLeftIcon />
            </div>
           <span className = 'text-sm font-semibold text-slate-200 tracking-tight flex-1'>
            Sphere
            </span>
            <span className='text-[10px] font-medium text-indigo-50 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide'>
                free</span>
                <button className = 'flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors duration-150 bg-transparent border-none cursor-pointer'>
                    <PenSquare size={14}/>
                </button>
        </div>
        <div className="px-4 pt-4 pb-1"  >
          <button className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] hover:opacity-90 transition-opacity duration-150">
            <Plus size={14}/>
            New Chat
          </button>
        </div>

        
        
      </div>
    </div>
  );
}
export default SideBar;
