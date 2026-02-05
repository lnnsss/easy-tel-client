import {observer} from "mobx-react-lite";
import {useStores} from "../../stores/StoreContext.js";
import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import styles from "./Auth.module.css"

const LoginPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [id, setId] = useState('');
    const [pass, setPass] = useState('');
    const [err, setErr] = useState('');

    const onLogin = async (e) => {
        e.preventDefault();
        const res = await authStore.login(id, pass);
        if (res.success) navigate('/profile');
        else setErr(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onLogin}>
                <h1>Вход в <span className={styles.brand}>EasyTel</span></h1>
                {err && <p className={styles.error}>{err}</p>}
                <input placeholder="Email или Username" value={id} onChange={e => setId(e.target.value)} required />
                <input type="password" placeholder="Пароль" value={pass} onChange={e => setPass(e.target.value)} required />
                <button className={styles.mainBtn}>Войти</button>
                <p className={styles.footerText}>Впервые здесь? <Link to="/register">Создать аккаунт</Link></p>
            </form>
        </div>
    );
});

export default LoginPage;