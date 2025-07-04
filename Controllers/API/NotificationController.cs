using MachineMonitoring.DataAccess.Repository;
using MachineMonitoring.Hubs;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace MachineMonitoring.Controllers.API
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationController : ControllerBase
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly AdminRepo _adminrepo;

        public NotificationController(IHubContext<NotificationHub> hubContext, AdminRepo adminrepo)
        {
            _hubContext = hubContext;
            _adminrepo = adminrepo;
        }

        [HttpPost("Signal")]
        public async Task<IActionResult> MachineMonitoringAlert([FromBody] OwsTicketDetails model)
        {

            var SaveNewTicket = await _adminrepo.SaveSignal(model);
            if (!SaveNewTicket.Success)
            {
                //send data to ows(ID and Message)
                //var id = model.id;
                //var cancellationReason = SaveNewTicket.Message;
                //await _adminrepo.SendDataToOws(id, cancellationReason);
                return BadRequest(new { success = false, message = SaveNewTicket.Message });
            }

            //Return success
            await _hubContext.Clients.All.SendAsync("ReceivedAlert", SaveNewTicket);
            return Ok(new { success = true, message = SaveNewTicket.Message});
        }

    }
}
