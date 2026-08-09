import { Coins, LogOut, MessageSquare, PanelLeftIcon, PanelRight, PenSquare, Plus, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { getConversations } from "../features/getConversations";
import { removeConversation, setConversations, setSelectedConversation } from "../redux/conversationSlice";
import { setMessages } from "../redux/messageSlice";
import { deleteConversation } from "../features/deleteConversation";
import { setUser } from "../redux/userSlice";
import { logoutUser } from "../services/auth.service";
import { createConversation } from "../features/createConversation";
import { addConversation } from "../redux/conversationSlice";

function SideBar() {
  const [collapsed, setCollapsed] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("")
  const [creating, setCreating] = useState(false)
  const { conversations, selectedConversation } = useSelector(state => state.conversation)
  const userData = useSelector(state => state.user.user)
  const avatarUrl = userData?.avatar || userData?.photoURL || userData?.picture
  const imageError = Boolean(avatarUrl && failedAvatarUrl === avatarUrl)
  const userName = userData?.name || userData?.displayName || "User"

  useEffect(() => {
    const getConv = async () => {
      const data = await getConversations()
      dispatch(setConversations(data))
    }
    getConv()
  }, [dispatch])

  const handleCreateConversation = async () => {
    if (creating) return
    setCreating(true)
    try {
      const conversation = await createConversation()
      dispatch(addConversation(conversation))
      dispatch(setSelectedConversation(conversation))
      dispatch(setMessages({ conversationId: conversation._id, messages: [] }))
    } catch (error) {
      console.error("Failed to create conversation:", error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteConversation = async (conversationId) => {
    try {
      await deleteConversation(conversationId)
      dispatch(removeConversation(conversationId))
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
    } finally {
      dispatch(setUser(null))
      dispatch(setConversations([]))
      navigate("/", { replace: true })
    }
  }

  if (collapsed) {
    return (
      <aside className="hidden lg:flex flex-col items-center w-[64px] h-screen shrink-0 bg-[var(--sphere-sidebar)] border-r border-[var(--sphere-divider)] py-3">
        <button
          type="button"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors duration-150"
        >
          <PanelRight size={18} />
        </button>
        <button
          type="button"
          title="New Chat"
          aria-label="New Chat"
          onClick={handleCreateConversation}
          disabled={creating}
          className="mt-2 flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--sphere-purple)] text-white transition-colors duration-150 hover:bg-[var(--sphere-purple-hover)]"
        >
          <Plus size={17} />
        </button>

        <div className="my-3 w-8 h-px bg-[var(--sphere-divider)]" />
        <div className="flex-1 w-full overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {conversations.map((conv) => {
            const isActive = selectedConversation?._id === conv?._id
            return (
              <button
                key={conv._id}
                type="button"
                title={conv.title || "New Chat"}
                aria-label={conv.title || "New Chat"}
                onClick={() => dispatch(setSelectedConversation(conv))}
                className={`mx-auto mb-1 flex items-center justify-center w-10 h-10 rounded-[10px] border transition-colors duration-150 ${isActive
                  ? "bg-[var(--sphere-active)] border-[var(--sphere-active-border)] text-[var(--sphere-purple)]"
                  : "border-transparent text-slate-500 hover:bg-white/[0.05]"}`}
              >
                <MessageSquare size={15} />
              </button>
            )
          })}
        </div>

        <div className="my-3 w-8 h-px bg-[var(--sphere-divider)]" />
        {userData ? (
          avatarUrl && !imageError ? (
            <img
              className="w-8 h-8 rounded-[9px] object-cover border-2 border-indigo-500/25"
              src={avatarUrl}
              alt={userName}
              title={userName}
              referrerPolicy="no-referrer"
              onError={() => setFailedAvatarUrl(avatarUrl)}
            />
          ) : (
            <div title={userName} className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-white/[0.06] text-slate-400">
              <User size={15} />
            </div>
          )
        ) : (
          <button
            type="button"
            title="Login"
            aria-label="Login"
            onClick={() => navigate("/")}
            className="flex items-center justify-center w-8 h-8 rounded-[9px] bg-white/[0.06] text-slate-400 hover:text-slate-200"
          >
            <User size={15} />
          </button>
        )}
        {userData && (
          <button
            type="button"
            title="Log out"
            aria-label="Log out"
            onClick={handleLogout}
            className="mt-2 flex items-center justify-center w-8 h-8 rounded-[7px] text-slate-600 hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
          >
            <LogOut size={16} />
          </button>
        )}
      </aside>
    )
  }


  return (
    <div className='fixed lg:static inset-y-0 left-0 z-50 w-[270px] h-screen shrink-0 bg-[var(--sphere-sidebar)] border-r border-[var(--sphere-divider)]'>
      <div className='flex flex-col h-full'>
        <div className='flex items-center gap-2.5 px-4 py-4 border-b border-[var(--sphere-divider)]'>
          <div className='hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors duration-150 bg-transparent border-none cursor-pointer'
            onClick={() => setCollapsed(true)}>
            <PanelLeftIcon />
          </div>
          <span className='text-sm font-semibold text-slate-200 tracking-tight flex-1'>
            Sphere
          </span>
          <span className='text-[10px] font-medium text-indigo-50 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide'>
            free</span>
          <button className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors duration-150 bg-transparent border-none cursor-pointer'
            onClick={handleCreateConversation}
            disabled={creating}
            title="New Chat"
            aria-label="New Chat">
            <PenSquare size={14} />
          </button>
        </div>
        <div className="px-4 pt-4 pb-1"  >
          <button className="w-full flex items-center justify-center gap-2.5 px-3 py-[10px] rounded-xl text-sm font-medium text-white bg-[var(--sphere-purple)] border-none cursor-pointer hover:bg-[var(--sphere-purple-hover)] transition-colors duration-150"
            onClick={handleCreateConversation}
            disabled={creating}>
            <Plus size={14} />
            New Chat
          </button>
        </div>

        {conversations.length === 0 ? (
          <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600">
            No Recent Conversations
          </div >
        ) : (
          <div className="px-5 pt-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600"
          >
              Recents
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {conversations.map((conv) => {
            const isActive = selectedConversation?._id === conv?._id
            return (
              <div
                key={conv._id}
                className={`group mb-0.5 flex w-full items-center rounded-[10px] border transition-colors duration-150
                  ${isActive
                    ? "bg-[var(--sphere-active)] border-[var(--sphere-active-border)]"
                    : "bg-transparent border-transparent"}`}>
                <button
                  type="button"
                  onClick={() => dispatch(setSelectedConversation(conv))}
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                >
                <div
                  className={`flex items-center justify-center shrink-0 w-[28px] h-[28px]
                    rounded-lg transition-colors duration-150
                    ${isActive
                      ? "bg-[var(--sphere-active)] text-[var(--sphere-purple)]"
                      : "bg-white/[0.05] text-slate-500"}`}
                >
                  <MessageSquare size={13} />
                </div>
                <span
                  className={`text-[13px] font-medium truncate ${isActive
                    ? "text-slate-100"
                    : "text-slate-300"}`}
                >
                  {conv.title || "New Chat"}
                </span>
                </button>
                <button
                  type="button"
                  title="Delete conversation"
                  aria-label={`Delete ${conv.title || "conversation"}`}
                  onClick={() => handleDeleteConversation(conv._id)}
                  className="mr-2 grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )

          })}
        </div>

        <div className="mx-2.5 h-px bg-[var(--sphere-divider)]" />
        <div className="p-3.5">
          {userData ? (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150">
              <div className="relative shrink-0">
                {avatarUrl && !imageError ? (
                  <img
                    className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
                    src={avatarUrl}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedAvatarUrl(avatarUrl)}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-slate-100">
                  {userName}
                </p>
                <p className="mt-px truncate text-[11px] text-slate-600">Free Plan</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  title="Credits"
                  aria-label="Credits"
                  className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                >
                  <Coins size={16} />
                </button>
                <button
                  type="button"
                  title="Log out"
                  aria-label="Log out"
                  onClick={handleLogout}
                  className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-300 hover:bg-white/[0.05] transition-colors duration-150"
            >
              Login
            </button>
          )}
        </div>

      </div>
    </div>
  )




}
export default SideBar;
