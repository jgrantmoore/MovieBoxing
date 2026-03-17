

const Footer: React.FC = () => {
    return (
        <footer className="py-10 text-center text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} Movie Boxing. All rights reserved.
        </footer>
    );
};

export default Footer;