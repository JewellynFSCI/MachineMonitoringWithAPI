using MachineMonitoring.DataAccess.Repository;
using Microsoft.AspNetCore.Mvc;
using MachineMonitoring.DataAccess;
using MachineMonitoring.Models;
using Microsoft.AspNetCore.SignalR;
using MachineMonitoring.Models.ViewModel;
using static System.Net.Mime.MediaTypeNames;
using static System.Runtime.InteropServices.JavaScript.JSType;
using System.Linq.Expressions;

namespace MachineMonitoring.Controllers
{
    public class AdminController : Controller
    {
        private readonly ILogger<AdminController> _logger;
        private readonly AdminRepo _adminrepo;
        private readonly IWebHostEnvironment _env;


        public AdminController(ILogger<AdminController> logger, AdminRepo adminrepo, IWebHostEnvironment env)
        {
            _logger = logger;
            _adminrepo = adminrepo;
            _env = env;
        }

        public IActionResult ProductionMaps()
        {
            return View();
        }

        #region 'GetPlantNos'
        public async Task<IActionResult> GetPlantNo()
        {
            try
            {
                var PlantNos = await _adminrepo.GetPLantNoList();
                return Json(PlantNos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'GetProductionMaps'
        [HttpGet]
        public async Task<IActionResult> GetProductionMaps(ProductionMap? model)
        {
            try
            {
                var locationList = await _adminrepo.GetProductionMapList(model);
                return Json(new { locationList });
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UploadProdMap || Add new prod map'
        [HttpPost]
        public async Task<IActionResult> UploadProdMap(ProductionMap model, IFormFile ImgFile)
        {
            try
            {
                var allowedExtensions = new[] { ".jpg", ".png" };
                var extension = Path.GetExtension(ImgFile.FileName).ToLower();

                if (!allowedExtensions.Contains(extension))
                {
                    ModelState.AddModelError("", "Unsupported file type.");
                    return View(model);
                }

                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new { success = false, message = "Model validation failed.", errors });
                }

                var checkProdName = await _adminrepo.CheckProdName(model);
                if (checkProdName > 0)
                {
                    return BadRequest(new { success = false, message = "Production Name already exists!"});
                }

                var fileName = Path.GetFileNameWithoutExtension(ImgFile.FileName);
                var fileExtension = Path.GetExtension(ImgFile.FileName);
                var uniqueFileName = $"{fileName}_{Guid.NewGuid()}{fileExtension}";

                var savePath = Path.Combine(_env.WebRootPath, "img/productionmap", uniqueFileName);

                var success = await _adminrepo.UploadProdMapRepo(model, uniqueFileName);
                if (success)
                {
                    using (var stream = new FileStream(savePath, FileMode.Create))
                    {
                        await ImgFile.CopyToAsync(stream);
                    }
                    return Ok("Saved successfully.");
                }
                else
                {
                    return BadRequest("Failed to insert record.");
                }
                   
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error." + ex.Message);
            }
        }
        #endregion

        #region 'DeleteMap'
        public async Task<IActionResult> DeleteMap(ProductionMap model)
        {
            try
            {
                // ❗ Get old image filename (you must pass it in the model or retrieve it from DB)
                string oldImageFileName = model.ImgName;
                var oldImagePath = Path.Combine(_env.WebRootPath, "img/productionmap", oldImageFileName);


                var delete = await _adminrepo.DeleteMapData(model);
                if (delete)
                {
                    System.IO.File.Delete(oldImagePath);
                    return Ok("Operation successfully.");
                }
                else
                {
                    return BadRequest("Failed to delete record.");
                }
                
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion

        #region 'UpdateProdMap || Update prod map and details'
        [HttpPost]
        public async Task<IActionResult> UpdateProdMap(ProductionMap model, IFormFile? ImgFile)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                    return BadRequest(new { success = false, message = "Model validation failed.", errors });
                }

                #region 'image replacement if replaced by end-user'
                if (ImgFile != null)
                {
                    var allowedExtensions = new[] { ".jpg", ".png" };
                    var extension = Path.GetExtension(ImgFile.FileName).ToLower();
                    if (!allowedExtensions.Contains(extension))
                    {
                        ModelState.AddModelError("", "Unsupported file type.");
                        return View(model);
                    }
                    var fileName = Path.GetFileNameWithoutExtension(ImgFile.FileName);
                    var fileExtension = Path.GetExtension(ImgFile.FileName);
                    var uniqueFileName = $"{fileName}_{Guid.NewGuid()}{fileExtension}";
                    var savePath = Path.Combine(_env.WebRootPath, "img/productionmap", uniqueFileName);

                    // ❗ Get old image filename (you must pass it in the model or retrieve it from DB)
                    string oldImageFileName = model.ImgName;
                    var oldImagePath = Path.Combine(_env.WebRootPath, "img/productionmap", oldImageFileName);

                    var success = await _adminrepo.UploadProdMapReplacedImg(model, uniqueFileName);
                    if (success)
                    {
                        System.IO.File.Delete(oldImagePath);
                        using (var stream = new FileStream(savePath, FileMode.Create))
                        {
                            await ImgFile.CopyToAsync(stream);
                        }
                    }
                }
                #endregion

                //Update the other details'
                var UpdateProdMapDetails =  await _adminrepo.UpdateProdMapDetails(model);
                return Ok("Saved successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Internal server error: " + ex.Message);
            }
        }
        #endregion


        public IActionResult MachineLocation()
        {
            return View();
        }


    }
}
