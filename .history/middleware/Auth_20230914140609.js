const authPage = permission => {
    return (req, res, next) => {
        const {role} = req.body;
        if(!role) {
            return res.status(403).json('Không có role')
        }
        if(!permission.include(role))
    }
}