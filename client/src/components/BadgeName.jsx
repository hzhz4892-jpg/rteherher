export default function BadgeName({ user }) {
  const badge = user?.badgeUnicode ? <span>{user.badgeUnicode}</span> : null;
  return (
    <span className="font-semibold">
      {user?.displayName || user?.username} {badge}
    </span>
  );
}
