import { Archive, ChevronDown, EyeOff, Pencil, Star, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { deleteConversation } from '../features/deleteConversation'
import { updateConversationTitle } from '../features/updateConversation'
import { removeConversation, updateConversation } from '../redux/conversationSlice'

function Nav() {
const {selectedConversation} = useSelector(state=> state.conversation)
const dispatch = useDispatch()
const menuRef = useRef(null)
const [open, setOpen] = useState(false)
const [renaming, setRenaming] = useState(false)
const [title, setTitle] = useState('')
const [starred, setStarred] = useState(false)
const [unread, setUnread] = useState(false)
const [inProject, setInProject] = useState(false)

useEffect(() => {
  const closeMenu = (event) => {
    if (!menuRef.current?.contains(event.target)) setOpen(false)
  }
  document.addEventListener('pointerdown', closeMenu)
  return () => document.removeEventListener('pointerdown', closeMenu)
}, [])

const renameConversation = async (event) => {
  event.preventDefault()
  const nextTitle = title.trim()
  if (!nextTitle || !selectedConversation?._id) return
  const updated = await updateConversationTitle(selectedConversation._id, nextTitle)
  dispatch(updateConversation(updated))
  setRenaming(false)
  setOpen(false)
}

const removeCurrentConversation = async () => {
  if (!selectedConversation?._id) return
  await deleteConversation(selectedConversation._id)
  dispatch(removeConversation(selectedConversation._id))
  setOpen(false)
}

const menuItem = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--sphere-text)] transition hover:bg-white/[0.07]'
  return (
    <>
    {selectedConversation &&  <div className='relative z-30 flex h-11 items-center px-4 bg-[var(--sphere-bg)]' >
      <div ref={menuRef} className='relative'>
       <button type='button' onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup='menu' className='flex max-w-[320px] items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] font-semibold text-[var(--sphere-text)] tracking-tight transition hover:bg-white/[0.06]'>
         <span className='truncate'>{selectedConversation?.title || "New Chat"}</span>
         <ChevronDown size={14} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
       </button>
       {open && <div role='menu' className='absolute left-0 top-[calc(100%+6px)] w-[205px] rounded-2xl border border-white/[0.12] bg-[#343432] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]'>
         {renaming ? (
           <form onSubmit={renameConversation} className='p-1.5'>
             <label htmlFor='conversation-title' className='sr-only'>Conversation title</label>
             <input id='conversation-title' autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={120} className='w-full rounded-lg border border-[var(--sphere-input-border)] bg-[var(--sphere-input)] px-3 py-2 text-[13px] text-[var(--sphere-text)] outline-none focus:border-[var(--sphere-purple)]' />
             <div className='mt-2 flex justify-end gap-2 text-xs'>
               <button type='button' onClick={() => setRenaming(false)} className='rounded-md px-2 py-1 text-slate-400 hover:bg-white/[0.06]'>Cancel</button>
               <button type='submit' className='rounded-md bg-indigo-500 px-2 py-1 text-white hover:bg-indigo-400'>Save</button>
             </div>
           </form>
         ) : <>
           <button role='menuitem' type='button' onClick={() => setStarred(value => !value)} className={menuItem}><Star size={16} fill={starred ? 'currentColor' : 'none'} /><span className='flex-1'>{starred ? 'Unstar' : 'Star'}</span><kbd className='text-[11px] text-slate-500'>P</kbd></button>
           <button role='menuitem' type='button' onClick={() => setUnread(value => !value)} className={menuItem}><EyeOff size={16} /><span className='flex-1'>{unread ? 'Mark as read' : 'Mark as unread'}</span><kbd className='text-[11px] text-slate-500'>U</kbd></button>
           <button role='menuitem' type='button' onClick={() => { setTitle(selectedConversation?.title || ''); setRenaming(true) }} className={menuItem}><Pencil size={16} /><span className='flex-1'>Rename</span><kbd className='text-[11px] text-slate-500'>R</kbd></button>
           <button role='menuitem' type='button' onClick={() => setInProject(value => !value)} className={menuItem}><Archive size={16} /><span className='flex-1'>{inProject ? 'Remove from project' : 'Add to project'}</span><span className='text-slate-500'>›</span></button>
           <div className='my-1 h-px bg-white/[0.1]' />
           <button role='menuitem' type='button' onClick={removeCurrentConversation} className={`${menuItem} text-red-400 hover:bg-red-500/10`}><Trash2 size={16} /><span className='flex-1'>Delete</span><kbd className='text-[11px] text-red-400/60'>D</kbd></button>
         </>}
       </div>}
      </div>
    </div>}
   </>
  )
}

export default Nav
