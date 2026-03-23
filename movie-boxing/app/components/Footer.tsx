import Link from "next/link";


const Footer: React.FC = () => {
    return (
        <footer className="py-10 text-center text-slate-600 text-sm">
            <p>&copy; {new Date().getFullYear()} Movie Boxing. All rights reserved.</p>
            <Link href="/privacy" className="ml-4 text-slate-600 hover:text-slate-300 transition-colors">
                Privacy Policy
            </Link>
        </footer>
    );
};

export default Footer;