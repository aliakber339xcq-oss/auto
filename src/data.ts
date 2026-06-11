import { 
  Youtube, 
  Globe, 
  Gamepad2, 
  Keyboard, 
  Smartphone, 
  Video, 
  Mail, 
  Send, 
  Crown, 
  CreditCard, 
  CheckSquare
} from 'lucide-react';

export const TASK_LIST = [
  { id: 'fb-reels', title: 'ফেসবুক রিলস ভিউ', icon: Video, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'fb-custom', title: 'ফেসবুক কাস্টম টাস্ক', icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 'youtube', title: 'ইউটিউব টাস্ক', icon: Youtube, color: 'text-red-500', bg: 'bg-red-100' },
  { id: 'website', title: 'ওয়েবসাইট ভিজিট', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { id: 'gmail', title: 'জিমেইল টাস্ক', icon: Mail, color: 'text-red-400', bg: 'bg-red-50' },
  { id: 'telegram', title: 'টেলিগ্রাম সেল', icon: Send, color: 'text-sky-500', bg: 'bg-sky-100' },
  { id: 'playstore', title: 'প্লেস্টোর টাস্ক', icon: Gamepad2, color: 'text-green-500', bg: 'bg-green-100' },
  { id: 'typing', title: 'টাইপিং টাস্ক', icon: Keyboard, color: 'text-slate-600', bg: 'bg-slate-200' },
  { id: 'tiktok', title: 'টিকটক টাস্ক', icon: Smartphone, color: 'text-pink-500', bg: 'bg-pink-100' },
  { id: 'special', title: 'স্পেশাল টাস্ক', icon: Video, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'premium', title: 'প্রিমিয়াম টাস্ক', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 'recharge', title: 'মোবাইল রিচার্জ', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-100' },
];
