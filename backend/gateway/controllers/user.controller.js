const getCurrentUser = (req, res) => {
  return res.status(200).json({ user: req.user });
};

export { getCurrentUser };
