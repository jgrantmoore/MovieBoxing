import Link from "next/link";


const Footer: React.FC = () => {
    return (
        <footer className="py-10 text-center text-slate-600 text-sm">
            <p>&copy; {new Date().getFullYear()} Movie Boxing. All rights reserved.</p>
            <div className="mt-2 flex items-center justify-center gap-4">
                <Link href="https://movieboxing.com/privacy" className="ml-4 text-slate-600 hover:text-slate-300 transition-colors">
                    Privacy Policy
                </Link>
                <Link href="https://movieboxing.com/contact" className="ml-4 text-slate-600 hover:text-slate-300 transition-colors">
                    Contact Us
                </Link>
            </div>
        </footer>
    );
};

export default Footer;