const authPage = permission => {
    return (req, res, next) => {
        const {role} = req.body;
        if(!role) {
            return res.status(40)
        }
    }
}