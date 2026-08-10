import { Box } from '~/shared/components/Base'

interface AdminPlayerScoreProps {
  score: number
}

const AdminPlayerScore = ({ score }: AdminPlayerScoreProps) => {
  return <Box color={score > 0 ? 'warm9' : 'forest4'}>{score.toFixed(2)}</Box>
}

export default AdminPlayerScore
