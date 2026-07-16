import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers/AuthProvider";
import { ToastProvider, ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Ganesha Gym - Fitness Center | DARE TO BE GREAT",
  description: "Ganesha Gym - Fitness Center dengan fasilitas terbaik. Alat gym import, kamar mandi bersih, loker, parkiran luas, dan smoking area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="antialiased">
        <ToastProvider>
          <Providers>{children}</Providers>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}

