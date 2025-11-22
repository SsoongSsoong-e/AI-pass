interface ProfileAvatarProps {
  imageUrl?: string;
  userName?: string;
  onClick?: () => void;
}

export default function ProfileAvatar({ imageUrl, userName = 'U', onClick }: ProfileAvatarProps) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center overflow-hidden shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={userName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xl font-bold text-gray-700">
          {userName.charAt(0).toUpperCase()}
        </span>
      )}
    </button>
  );
}