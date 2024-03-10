export const TextColorIcon: React.FC = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 32 32">
      <g strokeLinecap="round" strokeLinejoin="round">
        <g fill="none" stroke="#000">
          <rect transform="matrix(1,0,0,1,16,16)" strokeWidth="2" x="-5" y="-0.75" width="10" height="1.5" />
          <path fill="none" strokeWidth="3" d="M8,24 l8,-18.5 l8,18" />
          <rect transform="matrix(1,0,0,1,16,27)" strokeWidth="2" x="-10" y="-0.5" width="20" height="1" />
        </g>
        <g fill="currentColor" stroke="currentColor">
          <rect transform="matrix(1,0,0,1,16,16)" strokeWidth="1" x="-5" y="-0.75" width="10" height="1.5" />
          <path fill="none" strokeWidth="2" d="M8,24 l8,-18.5 l8,18" />
          <rect transform="matrix(1,0,0,1,16,27)" strokeWidth="1" x="-10" y="-0.5" width="20" height="1" />
        </g>
      </g>
    </svg>
  );
};

export const TextColorBgIcon: React.FC<{ color?: string }> = ({ color }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 32 32">
      <g strokeLinecap="round" strokeLinejoin="round">
        <g>
          <g fill="currentColor" stroke="#000">
            <rect strokeWidth="1" x="2" y="2" width="28" height="28" rx="2" ry="2" />
          </g>
          <g fill="none" stroke="#000">
            <rect transform="matrix(1,0,0,1,16,18)" strokeWidth="2" x="-5" y="-0.75" width="10" height="1.5" />
            <path fill="none" strokeWidth="3" d="M8,26 l8,-18.5 l8,18" />
          </g>
        </g>
        <g>
          <g fill={color ?? "#000"} stroke={color ?? "#000"}>
            <rect transform="matrix(1,0,0,1,16,18)" strokeWidth="1" x="-5" y="-0.75" width="10" height="1.5" />
            <path fill="none" strokeWidth="2" d="M8,26 l8,-18.5 l8,18" />
          </g>
        </g>
      </g>
    </svg>
  );
};
