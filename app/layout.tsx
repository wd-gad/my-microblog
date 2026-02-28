import "./globals.css";
import AuthBar from "./AuthBar";

export const metadata = {
  title: "My Microblog",
  description: "microblog",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body>
        <AuthBar />
        {children}
      </body>
    </html>
  );
}