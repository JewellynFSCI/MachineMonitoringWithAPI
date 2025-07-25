using System.Net.NetworkInformation;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.Mvc;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;
using MachineMonitoring.DataAccess.Repository;
using System.Data;
using MySql.Data.MySqlClient;
using Dapper;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using System.Text;
using MachineMonitoring.Models.ViewModel;
using MySqlX.XDevAPI.Common;

namespace MachineMonitoring.Controllers
{
    public class AutoTicketController : Controller
    {
        private readonly ILogger<AutoTicketController> _logger;
        private readonly AdminRepo _adminrepo;
        private readonly AdminVM _adminvm;

        public AutoTicketController(ILogger<AutoTicketController> logger, AdminRepo adminrepo, AdminVM adminvm)
        {
            _logger = logger;
            _adminrepo = adminrepo;
            _adminvm = adminvm;
        }

        [Route("AutoTicket/AutoTicket/{machineCode}")]
        public async Task<IActionResult> AutoTicket(string machineCode)
        {
            try
            {
                ViewBag.Result = TempData["Result"];
                ViewBag.Message = TempData["Message"];

                // Validate only if not already successful
                if (ViewBag.Result?.ToString() != "True")
                {
                    var validation = await _adminrepo.ValidateMachineCode(machineCode);
                    if (!validation.Success)
                    {
                        SetViewBagError(validation.Message);
                        return View();
                    }
                }

                var machineDetails = await _adminrepo.GetMachineDetails(machineCode);
                if (machineDetails?.Any() != true)
                {
                    SetViewBagError($"This machine: {machineCode} is not registered to the system!");
                    return View();
                }

                return View(machineDetails.First());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading AutoTicket view");
                return StatusCode(500, "Internal Server Error");
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateOWSTicket(AutoTicketModel model)
        {
            try
            {
                var owsDetails = await _adminrepo.GetOwsDetails();
                var ows = owsDetails.FirstOrDefault();

                var validation = await _adminrepo.ValidateMachineCode(model.MachineCode);
                if (!validation.Success)
                    return RedirectWithError(validation.Message, model.MachineCode);

                var response = await _adminrepo.CreateOWSTicketAPI(model, ows);
                if (response.Contains("successfully", StringComparison.OrdinalIgnoreCase))
                {
                    TempData["Result"] = "True";
                    TempData["Message"] = response;
                    return RedirectToAction("AutoTicket", new { machineCode = model.MachineCode });
                }

                return StatusCode(500, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending OWS ticket");
                ViewBag.Message = $"An error occurred: {ex.Message}";
                return View("AutoTicket", model);
            }
        }

        //Helper method to reduce duplication
        private void SetViewBagError(string message)
        {
            ViewBag.Result = "False";
            ViewBag.Message = message;
        }

        private IActionResult RedirectWithError(string message, string machineCode)
        {
            TempData["Result"] = "False";
            TempData["Message"] = message;
            return RedirectToAction("AutoTicket", new { machineCode });
        }

    }
}
