import React from 'react';
import defaultImage from '../assets/default.png';

interface ProfileAvatarProps {
  imageUrl?: string;
  userName?: string;
  onClick?: () => void;
}

export default function ProfileAvatar({ imageUrl, userName = 'U', onClick }: ProfileAvatarProps) {
  // 사용자 이미지가 있으면 사용, 없으면 기본 이미지 사용
  const displayImage = imageUrl || defaultImage;

  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
    >
      <img 
        src={displayImage} 
        alt={userName}
        className="w-full h-full object-cover"
      />
    </button>
  );
}