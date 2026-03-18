import { useState } from 'react'
import FacilityList from '../components/facilities/FacilityList'
import RoomManager from '../components/facilities/RoomManager'

export default function FacilitiesPage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)

  if (selectedFacilityId) {
    return (
      <RoomManager
        facilityId={selectedFacilityId}
        onBack={() => setSelectedFacilityId(null)}
      />
    )
  }

  return <FacilityList onManageRooms={(id) => setSelectedFacilityId(id)} />
}
